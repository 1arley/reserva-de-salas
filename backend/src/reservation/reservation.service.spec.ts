import { Test, TestingModule } from '@nestjs/testing';
import { ReservationService } from '@/reservation/reservation.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ReservationStatus, RoomStatus } from '@prisma/client';

describe('ReservationService', () => {
  let service: ReservationService;
  let prisma: PrismaService;

  const mockTx = {
    reservation: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockPrismaService = {
    room: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    reservation: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  mockPrismaService.$transaction.mockImplementation(
    (arg: unknown, _opts?: unknown) =>
      typeof arg === 'function'
        ? Promise.resolve(arg(mockTx))
        : Promise.all(arg as Promise<unknown>[]),
  );

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ReservationService>(ReservationService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const futureStart = '2099-01-01T10:00:00.000Z';
  const futureEnd = '2099-01-01T11:00:00.000Z';

  const baseReservation = {
    id: 'res-1',
    userId: 'user-1',
    roomId: 'room-1',
    startTime: new Date(futureStart),
    endTime: new Date(futureEnd),
    status: ReservationStatus.CONFIRMED,
    notes: 'Reunião de planejamento',
    createdAt: new Date('2099-01-01T09:00:00.000Z'),
    updatedAt: new Date('2099-01-01T09:00:00.000Z'),
    room: { id: 'room-1', name: 'Sala A', capacity: 10 },
    user: { id: 'user-1', name: 'User One', email: 'user1@example.com' },
  };

  const validCreateDto = {
    roomId: 'room-1',
    startTime: futureStart,
    endTime: futureEnd,
    notes: 'Reunião',
  };

  describe('create', () => {
    it('should throw BadRequestException when endTime <= startTime', async () => {
      await expect(
        service.create('user-1', {
          ...validCreateDto,
          endTime: futureStart,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create('user-1', {
          ...validCreateDto,
          endTime: '2099-01-01T09:00:00.000Z',
        }),
      ).rejects.toThrow(
        'O horário final deve ser posterior ao horário inicial.',
      );
      expect(prisma.room.findUnique).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when startTime is in the past', async () => {
      await expect(
        service.create('user-1', {
          ...validCreateDto,
          startTime: '2020-01-01T10:00:00.000Z',
          endTime: '2020-01-01T11:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create('user-1', {
          ...validCreateDto,
          startTime: '2020-01-01T10:00:00.000Z',
          endTime: '2020-01-01T11:00:00.000Z',
        }),
      ).rejects.toThrow('Não é possível reservar em um horário no passado.');
    });

    it('should throw BadRequestException when duration exceeds 24 hours', async () => {
      await expect(
        service.create('user-1', {
          ...validCreateDto,
          startTime: '2099-01-01T00:00:00.000Z',
          endTime: '2099-01-02T00:00:01.000Z',
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create('user-1', {
          ...validCreateDto,
          startTime: '2099-01-01T00:00:00.000Z',
          endTime: '2099-01-02T00:00:01.000Z',
        }),
      ).rejects.toThrow('A reserva não pode exceder 24 horas.');
    });

    it('should allow a reservation of exactly 24 hours (boundary)', async () => {
      mockPrismaService.room.findUnique.mockResolvedValue(null);

      await expect(
        service.create('user-1', {
          ...validCreateDto,
          startTime: '2099-01-01T00:00:00.000Z',
          endTime: '2099-01-02T00:00:00.000Z',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when room does not exist', async () => {
      mockPrismaService.room.findUnique.mockResolvedValue(null);

      await expect(service.create('user-1', validCreateDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create('user-1', validCreateDto)).rejects.toThrow(
        'Sala não encontrada.',
      );
    });

    it('should throw ConflictException when room is not AVAILABLE', async () => {
      mockPrismaService.room.findUnique.mockResolvedValue({
        id: 'room-1',
        status: RoomStatus.MAINTENANCE,
      });

      await expect(service.create('user-1', validCreateDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create('user-1', validCreateDto)).rejects.toThrow(
        'A sala não está disponível para reserva.',
      );
    });

    it('should throw ConflictException when an overlapping confirmed reservation exists', async () => {
      mockPrismaService.room.findUnique.mockResolvedValue({
        id: 'room-1',
        status: RoomStatus.AVAILABLE,
      });
      mockTx.reservation.findFirst.mockResolvedValue({ id: 'existing-res' });

      await expect(service.create('user-1', validCreateDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create('user-1', validCreateDto)).rejects.toThrow(
        'A sala já está reservada neste horário.',
      );
    });

    it('should query conflicts only among CONFIRMED reservations of the same room', async () => {
      mockPrismaService.room.findUnique.mockResolvedValue({
        id: 'room-1',
        status: RoomStatus.AVAILABLE,
      });
      mockTx.reservation.findFirst.mockResolvedValue(null);
      mockTx.reservation.create.mockResolvedValue(baseReservation);

      await service.create('user-1', validCreateDto);

      expect(mockTx.reservation.findFirst).toHaveBeenCalledWith({
        where: {
          roomId: 'room-1',
          status: ReservationStatus.CONFIRMED,
          startTime: { lt: new Date(futureEnd) },
          endTime: { gt: new Date(futureStart) },
        },
      });
    });

    it('should create a reservation with CONFIRMED status on success', async () => {
      mockPrismaService.room.findUnique.mockResolvedValue({
        id: 'room-1',
        status: RoomStatus.AVAILABLE,
      });
      mockTx.reservation.findFirst.mockResolvedValue(null);
      mockTx.reservation.create.mockResolvedValue(baseReservation);

      const result = await service.create('user-1', validCreateDto);

      expect(result.status).toBe(ReservationStatus.CONFIRMED);
      expect(result.id).toBe('res-1');
      expect(mockTx.reservation.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          roomId: 'room-1',
          startTime: new Date(futureStart),
          endTime: new Date(futureEnd),
          notes: 'Reunião',
        },
        include: expect.objectContaining({
          room: expect.anything(),
          user: expect.anything(),
        }),
      });
      expect(prisma.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        }),
      );
    });
  });

  describe('findMy', () => {
    it('should filter by userId, status, roomId and date range with pagination', async () => {
      mockPrismaService.reservation.findMany.mockResolvedValue([
        baseReservation,
      ]);
      mockPrismaService.reservation.count.mockResolvedValue(1);

      const filters = {
        status: ReservationStatus.CONFIRMED,
        roomId: 'room-1',
        from: '2099-01-01T00:00:00.000Z',
        to: '2099-02-01T00:00:00.000Z',
        page: 2,
        limit: 5,
      };

      const result = await service.findMy('user-1', filters);

      expect(prisma.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'user-1',
            status: ReservationStatus.CONFIRMED,
            roomId: 'room-1',
            startTime: {
              gte: new Date(filters.from),
              lte: new Date(filters.to),
            },
          },
          skip: 5,
          take: 5,
          orderBy: { startTime: 'desc' },
        }),
      );
      expect(result).toEqual({
        data: [baseReservation],
        total: 1,
        page: 2,
        limit: 5,
        totalPages: 1,
      });
    });

    it('should use default pagination and no date filters when omitted', async () => {
      mockPrismaService.reservation.findMany.mockResolvedValue([]);
      mockPrismaService.reservation.count.mockResolvedValue(0);

      await service.findMy('user-1', {});

      expect(prisma.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          skip: 0,
          take: 10,
        }),
      );
    });
  });

  describe('history', () => {
    it('should filter by userId and past endTime', async () => {
      mockPrismaService.reservation.findMany.mockResolvedValue([]);
      mockPrismaService.reservation.count.mockResolvedValue(0);

      await service.history('user-1', {});

      expect(prisma.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'user-1',
            endTime: { lt: expect.any(Date) },
          },
        }),
      );
    });

    it('should apply status filter when provided', async () => {
      mockPrismaService.reservation.findMany.mockResolvedValue([]);
      mockPrismaService.reservation.count.mockResolvedValue(0);

      await service.history('user-1', { status: ReservationStatus.CANCELLED });

      expect(prisma.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'user-1',
            endTime: { lt: expect.any(Date) },
            status: ReservationStatus.CANCELLED,
          },
        }),
      );
    });
  });

  describe('findAllAdmin', () => {
    it('should not filter by userId and apply provided filters', async () => {
      mockPrismaService.reservation.findMany.mockResolvedValue([]);
      mockPrismaService.reservation.count.mockResolvedValue(0);

      await service.findAllAdmin({ status: ReservationStatus.CONFIRMED });

      expect(prisma.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: ReservationStatus.CONFIRMED },
          skip: 0,
          take: 10,
        }),
      );
      expect(prisma.reservation.count).toHaveBeenCalledWith({
        where: { status: ReservationStatus.CONFIRMED },
      });
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when reservation is missing', async () => {
      mockPrismaService.reservation.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne('missing', 'user-1', 'USER'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.findOne('missing', 'user-1', 'USER'),
      ).rejects.toThrow('Reserva não encontrada.');
    });

    it('should return the reservation for the owner', async () => {
      mockPrismaService.reservation.findUnique.mockResolvedValue(
        baseReservation,
      );

      const result = await service.findOne('res-1', 'user-1', 'USER');

      expect(result).toEqual(baseReservation);
      expect(prisma.reservation.findUnique).toHaveBeenCalledWith({
        where: { id: 'res-1' },
        include: expect.anything(),
      });
    });

    it('should return the reservation for an admin even when not the owner', async () => {
      mockPrismaService.reservation.findUnique.mockResolvedValue(
        baseReservation,
      );

      const result = await service.findOne('res-1', 'user-2', 'ADMIN');

      expect(result.id).toBe('res-1');
    });

    it('should return the reservation for a SUPERADMIN even when not the owner', async () => {
      mockPrismaService.reservation.findUnique.mockResolvedValue(
        baseReservation,
      );

      const result = await service.findOne('res-1', 'user-2', 'SUPERADMIN');

      expect(result.id).toBe('res-1');
    });

    it('should throw ForbiddenException for another user', async () => {
      mockPrismaService.reservation.findUnique.mockResolvedValue(
        baseReservation,
      );

      await expect(service.findOne('res-1', 'user-2', 'USER')).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.findOne('res-1', 'user-2', 'USER')).rejects.toThrow(
        'Você não tem permissão para acessar esta reserva.',
      );
    });
  });

  describe('cancel', () => {
    it('should cancel a future reservation owned by the user', async () => {
      mockPrismaService.reservation.findUnique.mockResolvedValue(
        baseReservation,
      );
      mockPrismaService.reservation.update.mockResolvedValue({
        ...baseReservation,
        status: ReservationStatus.CANCELLED,
      });

      const result = await service.cancel('res-1', 'user-1', 'USER');

      expect(prisma.reservation.update).toHaveBeenCalledWith({
        where: { id: 'res-1' },
        data: { status: ReservationStatus.CANCELLED },
        include: expect.anything(),
      });
      expect(result.status).toBe(ReservationStatus.CANCELLED);
    });

    it('should throw ConflictException when already cancelled', async () => {
      mockPrismaService.reservation.findUnique.mockResolvedValue({
        ...baseReservation,
        status: ReservationStatus.CANCELLED,
      });

      await expect(service.cancel('res-1', 'user-1', 'USER')).rejects.toThrow(
        ConflictException,
      );
      await expect(service.cancel('res-1', 'user-1', 'USER')).rejects.toThrow(
        'Esta reserva já foi cancelada.',
      );
      expect(prisma.reservation.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when reservation already started', async () => {
      mockPrismaService.reservation.findUnique.mockResolvedValue({
        ...baseReservation,
        startTime: new Date('2020-01-01T10:00:00.000Z'),
        endTime: new Date('2020-01-01T11:00:00.000Z'),
      });

      await expect(service.cancel('res-1', 'user-1', 'USER')).rejects.toThrow(
        ConflictException,
      );
      await expect(service.cancel('res-1', 'user-1', 'USER')).rejects.toThrow(
        'Não é possível cancelar uma reserva já iniciada.',
      );
    });

    it('should throw ForbiddenException when a non-owner tries to cancel', async () => {
      mockPrismaService.reservation.findUnique.mockResolvedValue(
        baseReservation,
      );

      await expect(service.cancel('res-1', 'user-2', 'USER')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.reservation.update).not.toHaveBeenCalled();
    });
  });

  describe('weeklySchedule', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('should honor a custom weekStart date', async () => {
      mockPrismaService.reservation.findMany.mockResolvedValue([
        baseReservation,
      ]);

      const result = await service.weeklySchedule('2026-08-06T00:00:00.000Z');

      expect(result.weekStart).toEqual(new Date('2026-08-06T00:00:00.000Z'));
      expect(prisma.reservation.findMany).toHaveBeenCalledWith({
        where: {
          status: ReservationStatus.CONFIRMED,
          startTime: {
            gte: new Date('2026-08-06T00:00:00.000Z'),
            lt: new Date('2026-08-13T00:00:00.000Z'),
          },
        },
        include: expect.anything(),
        orderBy: { startTime: 'asc' },
      });
      expect(result.reservations).toHaveLength(1);
    });

    it('should default to Monday of the current week', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-08-12T15:30:00.000Z').getTime()); // quarta-feira
      mockPrismaService.reservation.findMany.mockResolvedValue([]);

      const result = await service.weeklySchedule();

      expect(result.weekStart).toEqual(new Date('2026-08-10T00:00:00'));
      expect(prisma.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: ReservationStatus.CONFIRMED,
            startTime: {
              gte: new Date('2026-08-10T00:00:00'),
              lt: new Date('2026-08-17T00:00:00'),
            },
          },
        }),
      );
    });

    it('should treat Sunday as belonging to the previous week (Monday back-dating)', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-08-09T10:00:00.000Z').getTime()); // domingo
      mockPrismaService.reservation.findMany.mockResolvedValue([]);

      const result = await service.weeklySchedule();

      expect(result.weekStart).toEqual(new Date('2026-08-03T00:00:00'));
    });
  });

  describe('getStats', () => {
    it('should return totals, cancellation rate and top rooms', async () => {
      mockPrismaService.room.count.mockResolvedValue(5);
      mockPrismaService.reservation.count
        .mockResolvedValueOnce(20) // totalReservations
        .mockResolvedValueOnce(3) // activeToday
        .mockResolvedValueOnce(4); // cancelled
      mockPrismaService.reservation.groupBy.mockResolvedValue([
        { roomId: 'room-1', _count: { _all: 10 } },
        { roomId: 'room-2', _count: { _all: 5 } },
      ]);
      mockPrismaService.room.findMany.mockResolvedValue([
        { id: 'room-1', name: 'Sala A' },
      ]);

      const result = await service.getStats();

      expect(result.totalRooms).toBe(5);
      expect(result.totalReservations).toBe(20);
      expect(result.activeToday).toBe(3);
      expect(result.cancellationRate).toBe(20);
      expect(result.topRooms).toEqual([
        { roomId: 'room-1', name: 'Sala A', count: 10 },
        { roomId: 'room-2', name: 'Sala', count: 5 },
      ]);
      expect(prisma.reservation.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          by: ['roomId'],
          where: { status: ReservationStatus.CONFIRMED },
          take: 5,
        }),
      );
    });

    it('should return zero cancellation rate and empty top rooms when no reservations exist', async () => {
      mockPrismaService.room.count.mockResolvedValue(0);
      mockPrismaService.reservation.count
        .mockResolvedValueOnce(0) // totalReservations
        .mockResolvedValueOnce(0) // activeToday
        .mockResolvedValueOnce(0); // cancelled
      mockPrismaService.reservation.groupBy.mockResolvedValue([]);

      const result = await service.getStats();

      expect(result.totalReservations).toBe(0);
      expect(result.cancellationRate).toBe(0);
      expect(result.topRooms).toEqual([]);
      expect(prisma.room.findMany).not.toHaveBeenCalled();
    });
  });

  describe('exportCsv', () => {
    it('should export all reservations for admins and only own for users', async () => {
      mockPrismaService.reservation.findMany.mockResolvedValue([]);

      await service.exportCsv('user-1', 'ADMIN');
      expect(prisma.reservation.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ where: {} }),
      );

      await service.exportCsv('user-1', 'USER');
      expect(prisma.reservation.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
    });

    it('should include the CSV header', async () => {
      mockPrismaService.reservation.findMany.mockResolvedValue([]);

      const csv = await service.exportCsv('user-1', 'USER');

      expect(csv).toContain('id,sala,usuario,email,inicio,fim,status');
    });

    it('should protect against CSV injection by prefixing dangerous cells', async () => {
      mockPrismaService.reservation.findMany.mockResolvedValue([
        {
          id: 'res-1',
          room: { id: 'room-1', name: '=cmd|calc', capacity: 5 },
          user: { id: 'user-1', name: 'User One', email: 'user1@example.com' },
          startTime: new Date('2099-01-01T10:00:00.000Z'),
          endTime: new Date('2099-01-01T11:00:00.000Z'),
          status: ReservationStatus.CONFIRMED,
        },
        {
          id: 'res-2',
          room: { id: 'room-2', name: '+SUM(1,1)', capacity: 5 },
          user: { id: 'user-1', name: 'User One', email: 'user1@example.com' },
          startTime: new Date('2099-01-02T10:00:00.000Z'),
          endTime: new Date('2099-01-02T11:00:00.000Z'),
          status: ReservationStatus.CONFIRMED,
        },
        {
          id: 'res-3',
          room: { id: 'room-3', name: '-2+3', capacity: 5 },
          user: { id: 'user-1', name: 'User One', email: 'user1@example.com' },
          startTime: new Date('2099-01-03T10:00:00.000Z'),
          endTime: new Date('2099-01-03T11:00:00.000Z'),
          status: ReservationStatus.CONFIRMED,
        },
        {
          id: 'res-4',
          room: { id: 'room-4', name: '@import', capacity: 5 },
          user: { id: 'user-1', name: 'User One', email: 'user1@example.com' },
          startTime: new Date('2099-01-04T10:00:00.000Z'),
          endTime: new Date('2099-01-04T11:00:00.000Z'),
          status: ReservationStatus.CONFIRMED,
        },
      ]);

      const csv = await service.exportCsv('user-1', 'USER');

      expect(csv).toContain('"\'=cmd|calc"');
      expect(csv).toContain('"\'+SUM(1,1)"');
      expect(csv).toContain('"\'-2+3"');
      expect(csv).toContain('"\'@import"');
      expect(csv).not.toContain('"=cmd|calc"');
    });

    it('should escape double quotes inside fields', async () => {
      mockPrismaService.reservation.findMany.mockResolvedValue([
        {
          id: 'res-1',
          room: { id: 'room-1', name: 'Sala "Premium"', capacity: 5 },
          user: {
            id: 'user-1',
            name: 'João "O" Teste',
            email: 'user1@example.com',
          },
          startTime: new Date('2099-01-01T10:00:00.000Z'),
          endTime: new Date('2099-01-01T11:00:00.000Z'),
          status: ReservationStatus.CONFIRMED,
        },
      ]);

      const csv = await service.exportCsv('user-1', 'USER');

      expect(csv).toContain('"Sala ""Premium"""');
      expect(csv).toContain('"João ""O"" Teste"');
    });
  });
});
