import { Test, TestingModule } from '@nestjs/testing';
import { FavoriteService } from '@/favorite/favorite.service';
import { PrismaService } from '@/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { RoomStatus } from '@prisma/client';

describe('FavoriteService', () => {
  let service: FavoriteService;
  let prisma: PrismaService;

  const mockPrismaService = {
    room: {
      findUnique: jest.fn(),
    },
    favorite: {
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
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

  describe('toggle', () => {
    it('should create a favorite and return favorited true when not already favorited', async () => {
      mockPrismaService.room.findUnique.mockResolvedValue(baseRoom);
      mockPrismaService.$transaction.mockImplementation(
        async (cb: (tx: any) => Promise<unknown>) => {
          const tx = {
            favorite: {
              findFirst: mockPrismaService.favorite.findFirst,
              create: mockPrismaService.favorite.create,
              delete: mockPrismaService.favorite.delete,
            },
          };
          return cb(tx);
        },
      );
      mockPrismaService.favorite.findFirst.mockResolvedValue(null);
      mockPrismaService.favorite.create.mockResolvedValue({
        id: 'fav-1',
        userId: 'user-1',
        roomId: 'room-1',
      });

      const result = await service.toggle('user-1', 'room-1');

      expect(prisma.room.findUnique).toHaveBeenCalledWith({
        where: { id: 'room-1' },
      });
      expect(prisma.favorite.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-1', roomId: 'room-1' },
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

    it('should delete the favorite when already favorited and return favorited false', async () => {
      mockPrismaService.room.findUnique.mockResolvedValue(baseRoom);
      mockPrismaService.$transaction.mockImplementation(
        async (cb: (tx: any) => Promise<unknown>) => {
          const tx = {
            favorite: {
              findFirst: mockPrismaService.favorite.findFirst,
              create: mockPrismaService.favorite.create,
              delete: mockPrismaService.favorite.delete,
            },
          };
          return cb(tx);
        },
      );
      mockPrismaService.favorite.findFirst.mockResolvedValue({
        id: 'fav-1',
        userId: 'user-1',
        roomId: 'room-1',
      });
      mockPrismaService.favorite.delete.mockResolvedValue({
        id: 'fav-1',
        userId: 'user-1',
        roomId: 'room-1',
      });

      const result = await service.toggle('user-1', 'room-1');

      expect(prisma.favorite.delete).toHaveBeenCalledWith({
        where: { userId: 'user-1', roomId: 'room-1' },
      });
      expect(result).toEqual({ favorited: false });
    });

    it('should rethrow errors from the transaction', async () => {
      mockPrismaService.room.findUnique.mockResolvedValue(baseRoom);
      mockPrismaService.$transaction.mockRejectedValue(new Error('boom'));

      await expect(service.toggle('user-1', 'room-1')).rejects.toThrow('boom');
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
