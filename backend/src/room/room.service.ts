import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ReservationStatus, RoomStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateRoomDto } from '@/room/dto/create-room.dto';
import { UpdateRoomDto } from '@/room/dto/update-room.dto';
import { FilterRoomDto } from '@/room/dto/filter-room.dto';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '@/common/constants';

@Injectable()
export class RoomService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRoomDto) {
    return this.prisma.room.create({ data: dto });
  }

  async findAll(filters: FilterRoomDto) {
    const page = filters.page ?? DEFAULT_PAGE;
    const limit = filters.limit ?? DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * limit;

    const where: Prisma.RoomWhereInput = {};

    if (filters.search) {
      where.name = { contains: filters.search, mode: 'insensitive' };
    }

    if (filters.minCapacity) {
      where.capacity = { gte: filters.minCapacity };
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.availableFrom && filters.availableTo) {
      const from = new Date(filters.availableFrom + 'T00:00:00');
      const to = new Date(filters.availableTo + 'T23:59:59.999');
      where.reservations = {
        none: {
          status: 'CONFIRMED',
          startTime: { lt: to },
          endTime: { gt: from },
        },
      };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.room.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.room.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const room = await this.prisma.room.findUnique({ where: { id } });

    if (!room) {
      throw new NotFoundException('Sala não encontrada.');
    }

    return room;
  }

  async update(id: string, dto: UpdateRoomDto) {
    await this.findOne(id);

    if (dto.status && dto.status !== RoomStatus.AVAILABLE) {
      const upcoming = await this.prisma.reservation.count({
        where: {
          roomId: id,
          status: ReservationStatus.CONFIRMED,
          endTime: { gt: new Date() },
        },
      });

      if (upcoming > 0) {
        throw new ConflictException(
          'Não é possível desativar uma sala com reservas futuras ativas.',
        );
      }
    }

    return this.prisma.room.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);

    const upcomingReservations = await this.prisma.reservation.count({
      where: {
        roomId: id,
        status: ReservationStatus.CONFIRMED,
        endTime: { gt: new Date() },
      },
    });

    if (upcomingReservations > 0) {
      throw new ConflictException(
        'Não é possível excluir uma sala com reservas futuras ativas.',
      );
    }

    await this.prisma.room.delete({ where: { id } });
    return { message: 'Sala excluída com sucesso.' };
  }
}
