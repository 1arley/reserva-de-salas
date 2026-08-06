import { Test, TestingModule } from '@nestjs/testing';
import { RoomService } from '@/room/room.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ReservationStatus, RoomStatus } from '@prisma/client';

describe('RoomService', () => {
  let service: RoomService;
  let prisma: PrismaService;

  const mockPrismaService = {
    room: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    reservation: {
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<RoomService>(RoomService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const baseRoom = {
    id: 'room-1',
    name: 'Sala de Reunião A',
    description: 'Sala com projetor',
    capacity: 10,
    resources: ['projetor'],
    status: RoomStatus.AVAILABLE,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  describe('create', () => {
    it('should pass the dto to prisma.room.create', async () => {
      const dto = {
        name: 'Sala de Reunião B',
        description: 'Sala nova',
        capacity: 8,
        resources: ['whiteboard'],
      };

      mockPrismaService.room.create.mockResolvedValue({ ...baseRoom, ...dto });

      const result = await service.create(dto);

      expect(prisma.room.create).toHaveBeenCalledWith({ data: dto });
      expect(result.name).toBe(dto.name);
      expect(result.capacity).toBe(dto.capacity);
    });
  });

  describe('findAll', () => {
    it('should use default pagination when no filters are provided', async () => {
      mockPrismaService.$transaction.mockResolvedValue([[baseRoom], 1]);

      const result = await service.findAll({});

      expect(prisma.room.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
      expect(result).toEqual({
        data: [baseRoom],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should calculate skip from page and limit', async () => {
      mockPrismaService.$transaction.mockResolvedValue([[], 0]);

      await service.findAll({ page: 3, limit: 5 });

      expect(prisma.room.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 5 }),
      );
      expect(prisma.room.count).toHaveBeenCalledWith({ where: {} });
    });

    it('should apply search filter (case insensitive contains)', async () => {
      mockPrismaService.$transaction.mockResolvedValue([[], 0]);

      await service.findAll({ search: 'sala' });

      expect(prisma.room.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { name: { contains: 'sala', mode: 'insensitive' } },
        }),
      );
    });

    it('should apply minCapacity filter', async () => {
      mockPrismaService.$transaction.mockResolvedValue([[], 0]);

      await service.findAll({ minCapacity: 10 });

      expect(prisma.room.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { capacity: { gte: 10 } } }),
      );
    });

    it('should apply status filter', async () => {
      mockPrismaService.$transaction.mockResolvedValue([[], 0]);

      await service.findAll({ status: RoomStatus.MAINTENANCE });

      expect(prisma.room.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: RoomStatus.MAINTENANCE } }),
      );
    });

    it('should apply availability filter with overlapping confirmed reservations', async () => {
      mockPrismaService.$transaction.mockResolvedValue([[], 0]);

      const availableFrom = '2026-08-10T10:00:00.000Z';
      const availableTo = '2026-08-10T12:00:00.000Z';

      await service.findAll({ availableFrom, availableTo });

      expect(prisma.room.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            reservations: {
              none: {
                status: 'CONFIRMED',
                startTime: { lt: new Date(availableTo) },
                endTime: { gt: new Date(availableFrom) },
              },
            },
          },
        }),
      );
    });

    it('should compute totalPages correctly', async () => {
      mockPrismaService.$transaction.mockResolvedValue([[], 25]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(3);
    });
  });

  describe('findOne', () => {
    it('should return the room when found', async () => {
      mockPrismaService.room.findUnique.mockResolvedValue(baseRoom);

      const result = await service.findOne('room-1');

      expect(prisma.room.findUnique).toHaveBeenCalledWith({
        where: { id: 'room-1' },
      });
      expect(result).toEqual(baseRoom);
    });

    it('should throw NotFoundException when room is missing', async () => {
      mockPrismaService.room.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('missing')).rejects.toThrow(
        'Sala não encontrada.',
      );
    });
  });

  describe('update', () => {
    const updateDto = { name: 'Sala Renomeada' };

    it('should throw NotFoundException when room is missing', async () => {
      mockPrismaService.room.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when changing status to MAINTENANCE with upcoming confirmed reservations', async () => {
      mockPrismaService.room.findUnique.mockResolvedValue(baseRoom);
      mockPrismaService.reservation.count.mockResolvedValue(2);

      await expect(
        service.update('room-1', { status: RoomStatus.MAINTENANCE }),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.update('room-1', { status: RoomStatus.MAINTENANCE }),
      ).rejects.toThrow(
        'Não é possível desativar uma sala com reservas futuras ativas.',
      );

      expect(prisma.reservation.count).toHaveBeenCalledWith({
        where: {
          roomId: 'room-1',
          status: ReservationStatus.CONFIRMED,
          endTime: { gt: expect.any(Date) },
        },
      });
    });

    it('should throw ConflictException when changing status to INACTIVE with upcoming confirmed reservations', async () => {
      mockPrismaService.room.findUnique.mockResolvedValue(baseRoom);
      mockPrismaService.reservation.count.mockResolvedValue(1);

      await expect(
        service.update('room-1', { status: RoomStatus.INACTIVE }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.room.update).not.toHaveBeenCalled();
    });

    it('should allow status change when no upcoming reservations exist', async () => {
      mockPrismaService.room.findUnique.mockResolvedValue(baseRoom);
      mockPrismaService.reservation.count.mockResolvedValue(0);
      mockPrismaService.room.update.mockResolvedValue({
        ...baseRoom,
        status: RoomStatus.MAINTENANCE,
      });

      const result = await service.update('room-1', {
        status: RoomStatus.MAINTENANCE,
      });

      expect(prisma.room.update).toHaveBeenCalledWith({
        where: { id: 'room-1' },
        data: { status: RoomStatus.MAINTENANCE },
      });
      expect(result.status).toBe(RoomStatus.MAINTENANCE);
    });

    it('should allow changing back to AVAILABLE even with upcoming reservations', async () => {
      mockPrismaService.room.findUnique.mockResolvedValue(baseRoom);
      mockPrismaService.room.update.mockResolvedValue({
        ...baseRoom,
        status: RoomStatus.AVAILABLE,
      });

      await service.update('room-1', { status: RoomStatus.AVAILABLE });

      expect(prisma.reservation.count).not.toHaveBeenCalled();
      expect(prisma.room.update).toHaveBeenCalled();
    });

    it('should allow updating non-status fields without checking reservations', async () => {
      mockPrismaService.room.findUnique.mockResolvedValue(baseRoom);
      mockPrismaService.room.update.mockResolvedValue({
        ...baseRoom,
        name: 'Sala Renomeada',
      });

      await service.update('room-1', updateDto);

      expect(prisma.reservation.count).not.toHaveBeenCalled();
      expect(prisma.room.update).toHaveBeenCalledWith({
        where: { id: 'room-1' },
        data: updateDto,
      });
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException when room is missing', async () => {
      mockPrismaService.room.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when upcoming confirmed reservations exist', async () => {
      mockPrismaService.room.findUnique.mockResolvedValue(baseRoom);
      mockPrismaService.reservation.count.mockResolvedValue(1);

      await expect(service.remove('room-1')).rejects.toThrow(ConflictException);
      await expect(service.remove('room-1')).rejects.toThrow(
        'Não é possível excluir uma sala com reservas futuras ativas.',
      );
      expect(prisma.room.delete).not.toHaveBeenCalled();
    });

    it('should delete the room when only past reservations exist', async () => {
      mockPrismaService.room.findUnique.mockResolvedValue(baseRoom);
      mockPrismaService.reservation.count.mockResolvedValue(0);
      mockPrismaService.room.delete.mockResolvedValue(baseRoom);

      const result = await service.remove('room-1');

      expect(prisma.reservation.count).toHaveBeenCalledWith({
        where: {
          roomId: 'room-1',
          status: ReservationStatus.CONFIRMED,
          endTime: { gt: expect.any(Date) },
        },
      });
      expect(prisma.room.delete).toHaveBeenCalledWith({
        where: { id: 'room-1' },
      });
      expect(result).toEqual({ message: 'Sala excluída com sucesso.' });
    });
  });
});
