import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class FavoriteService {
  constructor(private readonly prisma: PrismaService) {}

  async toggle(userId: string, roomId: string) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });

    if (!room) {
      throw new NotFoundException('Sala não encontrada.');
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.favorite.findFirst({
        where: { userId, roomId },
      });

      if (existing) {
        await tx.favorite.delete({
          where: { userId, roomId },
        });
        return { favorited: false };
      }

      await tx.favorite.create({
        data: { userId, roomId },
      });
      return { favorited: true };
    });
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
