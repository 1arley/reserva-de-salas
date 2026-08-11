import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ReservationStatus, RoomStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateReservationDto } from '@/reservation/dto/create-reservation.dto';
import { FilterReservationDto } from '@/reservation/dto/filter-reservation.dto';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '@/common/constants';

const RESERVATION_INCLUDE = {
  room: { select: { id: true, name: true, capacity: true } },
  user: { select: { id: true, name: true, email: true } },
} satisfies Prisma.ReservationInclude;

const MAX_DURATION_MS = 24 * 60 * 60 * 1000;

function csvField(value: string): string {
  const sanitized = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${sanitized.replace(/"/g, '""')}"`;
}

@Injectable()
export class ReservationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateReservationDto) {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (startTime >= endTime) {
      throw new BadRequestException(
        'O horário final deve ser posterior ao horário inicial.',
      );
    }

    if (startTime < new Date()) {
      throw new BadRequestException(
        'Não é possível reservar em um horário no passado.',
      );
    }

    if (endTime.getTime() - startTime.getTime() > MAX_DURATION_MS) {
      throw new BadRequestException('A reserva não pode exceder 24 horas.');
    }

    const room = await this.prisma.room.findUnique({
      where: { id: dto.roomId },
    });

    if (!room) {
      throw new NotFoundException('Sala não encontrada.');
    }

    if (room.status !== RoomStatus.AVAILABLE) {
      throw new ConflictException('A sala não está disponível para reserva.');
    }

    return this.prisma.$transaction(
      async (tx) => {
        const conflict = await tx.reservation.findFirst({
          where: {
            roomId: dto.roomId,
            status: ReservationStatus.CONFIRMED,
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
        });

        if (conflict) {
          throw new ConflictException(
            'A sala já está reservada neste horário.',
          );
        }

        return tx.reservation.create({
          data: {
            userId,
            roomId: dto.roomId,
            startTime,
            endTime,
            notes: dto.notes,
          },
          include: RESERVATION_INCLUDE,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async findMy(userId: string, filters: FilterReservationDto) {
    const page = filters.page ?? DEFAULT_PAGE;
    const limit = filters.limit ?? DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * limit;

    const where: Prisma.ReservationWhereInput = { userId };

    if (filters.status) where.status = filters.status;
    if (filters.roomId) where.roomId = filters.roomId;
    if (filters.from || filters.to) {
      where.startTime = {};
      if (filters.from) where.startTime.gte = new Date(filters.from);
      if (filters.to) where.startTime.lte = new Date(filters.to);
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.reservation.findMany({
        where,
        include: RESERVATION_INCLUDE,
        skip,
        take: limit,
        orderBy: { startTime: 'desc' },
      }),
      this.prisma.reservation.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, userId: string, role: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: RESERVATION_INCLUDE,
    });

    if (!reservation) {
      throw new NotFoundException('Reserva não encontrada.');
    }

    if (
      reservation.userId !== userId &&
      !['ADMIN', 'SUPERADMIN'].includes(role)
    ) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar esta reserva.',
      );
    }

    return reservation;
  }

  async cancel(id: string, userId: string, role: string) {
    const reservation = await this.findOne(id, userId, role);

    if (reservation.status === ReservationStatus.CANCELLED) {
      throw new ConflictException('Esta reserva já foi cancelada.');
    }

    if (reservation.startTime < new Date()) {
      throw new ConflictException(
        'Não é possível cancelar uma reserva já iniciada.',
      );
    }

    return this.prisma.reservation.update({
      where: { id },
      data: { status: ReservationStatus.CANCELLED },
      include: RESERVATION_INCLUDE,
    });
  }

  async weeklySchedule(weekStart?: string) {
    const monday = this.getWeekStart(weekStart);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 7);

    const reservations = await this.prisma.reservation.findMany({
      where: {
        status: ReservationStatus.CONFIRMED,
        startTime: { gte: monday, lt: sunday },
      },
      include: RESERVATION_INCLUDE,
      orderBy: { startTime: 'asc' },
    });

    return { weekStart: monday, reservations };
  }

  async history(userId: string, filters: FilterReservationDto) {
    const page = filters.page ?? DEFAULT_PAGE;
    const limit = filters.limit ?? DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * limit;

    const where: Prisma.ReservationWhereInput = {
      userId,
      endTime: { lt: new Date() },
    };

    if (filters.status) where.status = filters.status;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.reservation.findMany({
        where,
        include: RESERVATION_INCLUDE,
        skip,
        take: limit,
        orderBy: { startTime: 'desc' },
      }),
      this.prisma.reservation.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findAllAdmin(filters: FilterReservationDto) {
    const page = filters.page ?? DEFAULT_PAGE;
    const limit = filters.limit ?? DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * limit;

    const where: Prisma.ReservationWhereInput = {};

    if (filters.status) where.status = filters.status;
    if (filters.roomId) where.roomId = filters.roomId;
    if (filters.from || filters.to) {
      where.startTime = {};
      if (filters.from) where.startTime.gte = new Date(filters.from);
      if (filters.to) where.startTime.lte = new Date(filters.to);
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.reservation.findMany({
        where,
        include: RESERVATION_INCLUDE,
        skip,
        take: limit,
        orderBy: { startTime: 'desc' },
      }),
      this.prisma.reservation.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getStats() {
    const now = new Date();

    const [totalRooms, totalReservations, activeToday, cancelled, topRooms] =
      await Promise.all([
        this.prisma.room.count(),
        this.prisma.reservation.count(),
        this.prisma.reservation.count({
          where: {
            status: ReservationStatus.CONFIRMED,
            startTime: { lte: now },
            endTime: { gte: now },
          },
        }),
        this.prisma.reservation.count({
          where: { status: ReservationStatus.CANCELLED },
        }),
        this.prisma.reservation.groupBy({
          by: ['roomId'],
          where: { status: ReservationStatus.CONFIRMED },
          _count: { _all: true },
          orderBy: { _count: { roomId: 'desc' } },
          take: 5,
        }),
      ]);

    const topRoomIds = topRooms.map((r) => r.roomId);
    const rooms = topRoomIds.length
      ? await this.prisma.room.findMany({
          where: { id: { in: topRoomIds } },
          select: { id: true, name: true },
        })
      : [];

    return {
      totalRooms,
      totalReservations,
      activeToday,
      cancellationRate: totalReservations
        ? Number(((cancelled / totalReservations) * 100).toFixed(2))
        : 0,
      topRooms: topRooms.map((r) => ({
        roomId: r.roomId,
        name: rooms.find((room) => room.id === r.roomId)?.name ?? 'Sala',
        count: r._count._all,
      })),
    };
  }

  async exportCsv(userId: string, role: string) {
    const reservations = await this.prisma.reservation.findMany({
      where: role === 'ADMIN' || role === 'SUPERADMIN' ? {} : { userId },
      include: RESERVATION_INCLUDE,
      orderBy: { startTime: 'desc' },
    });

    const header = 'id,sala,usuario,email,inicio,fim,status\n';
    const rows = reservations
      .map((r) =>
        [
          csvField(r.id),
          csvField(r.room.name),
          csvField(r.user.name ?? ''),
          csvField(r.user.email),
          csvField(r.startTime.toISOString()),
          csvField(r.endTime.toISOString()),
          csvField(r.status),
        ].join(','),
      )
      .join('\n');

    return header + (rows ? rows + '\n' : '');
  }

  private getWeekStart(weekStart?: string): Date {
    if (weekStart) {
      const date = new Date(weekStart);
      if (!Number.isNaN(date.getTime())) return date;
    }

    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }
}
