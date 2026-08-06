import { Test, TestingModule } from '@nestjs/testing';
import { FavoriteService } from '@/favorite/favorite.service';
import { PrismaService } from '@/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { Prisma, RoomStatus } from '@prisma/client';

describe('FavoriteService', () => {
  let service: FavoriteService;
  let prisma: PrismaService;

  const mockPrismaService = {
    room: {
      findUnique: jest.fn(),
    },
    favorite: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoriteService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<FavoriteService>(FavoriteService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const baseRoom = {
    id: 'room-1',
    name: 'Sala de Reunião A',
    description: null,
    capacity: 10,
    resources: [],
    status: RoomStatus.AVAILABLE,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  const p2002Error = () =>
    new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '7.7.0',
    });

  describe('toggle', () => {
    it('should create a favorite and return favorited true', async () => {
      mockPrismaService.room.findUnique.mockResolvedValue(baseRoom);
      mockPrismaService.favorite.create.mockResolvedValue({
        id: 'fav-1',
        userId: 'user-1',
        roomId: 'room-1',
      });

      const result = await service.toggle('user-1', 'room-1');

      expect(prisma.room.findUnique).toHaveBeenCalledWith({
        where: { id: 'room-1' },
      });
      expect(prisma.favorite.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', roomId: 'room-1' },
      });
      expect(result).toEqual({ favorited: true });
    });

    it('should throw NotFoundException when room is missing', async () => {
      mockPrismaService.room.findUnique.mockResolvedValue(null);

      await expect(service.toggle('user-1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.toggle('user-1', 'missing')).rejects.toThrow(
        'Sala não encontrada.',
      );
      expect(prisma.favorite.create).not.toHaveBeenCalled();
    });

    it('should delete the favorite on P2002 race and return favorited false', async () => {
      mockPrismaService.room.findUnique.mockResolvedValue(baseRoom);
      mockPrismaService.favorite.create.mockRejectedValue(p2002Error());
      mockPrismaService.favorite.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.toggle('user-1', 'room-1');

      expect(prisma.favorite.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', roomId: 'room-1' },
      });
      expect(result).toEqual({ favorited: false });
    });

    it('should rethrow non-P2002 errors', async () => {
      mockPrismaService.room.findUnique.mockResolvedValue(baseRoom);
      mockPrismaService.favorite.create.mockRejectedValue(new Error('boom'));

      await expect(service.toggle('user-1', 'room-1')).rejects.toThrow('boom');
      expect(prisma.favorite.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return the favorited rooms ordered by creation', async () => {
      const room2 = { ...baseRoom, id: 'room-2', name: 'Sala B' };
      mockPrismaService.favorite.findMany.mockResolvedValue([
        { id: 'fav-2', room: room2 },
        { id: 'fav-1', room: baseRoom },
      ]);

      const result = await service.findAll('user-1');

      expect(prisma.favorite.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: { room: true },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([room2, baseRoom]);
    });

    it('should return an empty array when no favorites exist', async () => {
      mockPrismaService.favorite.findMany.mockResolvedValue([]);

      const result = await service.findAll('user-1');

      expect(result).toEqual([]);
    });
  });
});
