import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class FavoriteService {
  constructor(private readonly prisma: PrismaService) {}

  async toggle(userId: string, roomId: string) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });

    if (!room) {
      throw new NotFoundException('Sala não encontrada.');
    }

    try {
      await this.prisma.favorite.create({ data: { userId, roomId } });
      return { favorited: true };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        await this.prisma.favorite.deleteMany({ where: { userId, roomId } });
        return { favorited: false };
      }
      throw error;
    }
  }

  async findAll(userId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      include: { room: true },
      orderBy: { createdAt: 'desc' },
    });

    return favorites.map((f) => f.room);
  }
}
