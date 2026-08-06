import request from 'supertest';
import {
  getApp,
  getPrismaService,
  createTestUser,
} from '@test/setup/e2e.setup';
import { ReservationStatus } from '@prisma/client';

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: { id: string; email: string; name: string; role: string };
}

interface ErrorResponse {
  message: string | string[];
  error: string;
  statusCode: number;
}

interface ReservationResponse {
  id: string;
  userId: string;
  roomId: string;
  startTime: string;
  endTime: string;
  status: string;
  notes?: string | null;
  room?: { id: string; name: string; capacity: number };
  user?: { id: string; name: string; email: string };
}

const iso = (offsetMs: number): string =>
  new Date(Date.now() + offsetMs).toISOString();

describe('Reservations (e2e)', () => {
  let adminToken: string;
  let userToken: string;
  let otherUserToken: string;
  let regularUserId: string;
  let roomId: string;

  const login = async (email: string, password: string): Promise<string> => {
    const app = getApp();
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    return (response.body as LoginResponse).access_token;
  };

  const createRoomAsAdmin = async (): Promise<string> => {
    const app = getApp();
    const response = await request(app.getHttpServer())
      .post('/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Sala Reservas ${Date.now()}`,
        capacity: 10,
        description: 'Sala para testes de reserva',
      })
      .expect(201);
    return (response.body as { id: string }).id;
  };

  const createReservation = async (
    token: string,
    startTime: string,
    endTime: string,
    notes = 'Reunião de teste',
  ): Promise<ReservationResponse> => {
    const app = getApp();
    const response = await request(app.getHttpServer())
      .post('/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({ roomId, startTime, endTime, notes })
      .expect(201);
    return response.body as ReservationResponse;
  };

  const createReservationForRoom = async (
    token: string,
    targetRoomId: string,
    startTime: string,
    endTime: string,
  ): Promise<ReservationResponse> => {
    const app = getApp();
    const response = await request(app.getHttpServer())
      .post('/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({ roomId: targetRoomId, startTime, endTime })
      .expect(201);
    return response.body as ReservationResponse;
  };

  beforeAll(async () => {
    const admin = await createTestUser(
      'admin@example.com',
      'Admin123!',
      'Admin User',
      'ADMIN',
    );
    const regularUser = await createTestUser(
      'user@example.com',
      'User123!',
      'Regular User',
      'USER',
    );
    await createTestUser('other@example.com', 'User123!', 'Other User', 'USER');
    regularUserId = regularUser.id;
    expect(admin.id).toBeDefined();

    adminToken = await login('admin@example.com', 'Admin123!');
    userToken = await login('user@example.com', 'User123!');
    otherUserToken = await login('other@example.com', 'User123!');

    roomId = await createRoomAsAdmin();
  });

  afterEach(async () => {
    const prisma = getPrismaService();
    await prisma.reservation.deleteMany({});
    await prisma.favorite.deleteMany({});
    // Mantém a sala compartilhada criada no beforeAll
    await prisma.room.deleteMany({ where: { id: { not: roomId } } });
  });

  describe('POST /reservations', () => {
    it('should create a reservation with CONFIRMED status', async () => {
      const reservation = await createReservation(
        userToken,
        iso(3600_000),
        iso(7200_000),
      );

      expect(reservation.id).toBeDefined();
      expect(reservation.status).toBe('CONFIRMED');
      expect(reservation.roomId).toBe(roomId);
      expect(reservation.userId).toBe(regularUserId);
      expect(reservation.room?.name).toContain('Sala Reservas');
    });

    it('should return 409 for an overlapping reservation on the same room', async () => {
      const app = getApp();
      const start = iso(3600_000);
      const end = iso(7200_000);
      await createReservation(userToken, start, end);

      const response = await request(app.getHttpServer())
        .post('/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ roomId, startTime: iso(5400_000), endTime: iso(9000_000) })
        .expect(409);

      expect((response.body as ErrorResponse).message).toContain(
        'já está reservada',
      );
    });

    it('should allow adjacent reservations (endTime equals next startTime)', async () => {
      const app = getApp();
      const start = iso(3600_000);
      const end = iso(7200_000);
      await createReservation(userToken, start, end);

      const response = await request(app.getHttpServer())
        .post('/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ roomId, startTime: end, endTime: iso(10_800_000) })
        .expect(201);

      expect((response.body as ReservationResponse).status).toBe('CONFIRMED');
    });

    it('should return 400 when startTime is in the past', async () => {
      const app = getApp();

      const response = await request(app.getHttpServer())
        .post('/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ roomId, startTime: iso(-3600_000), endTime: iso(3600_000) })
        .expect(400);

      expect((response.body as ErrorResponse).message).toContain('passado');
    });

    it('should return 400 when endTime <= startTime', async () => {
      const app = getApp();

      const response = await request(app.getHttpServer())
        .post('/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ roomId, startTime: iso(3600_000), endTime: iso(3600_000) })
        .expect(400);

      expect((response.body as ErrorResponse).message).toContain('posterior');
    });

    it('should return 400 when duration exceeds 24 hours', async () => {
      const app = getApp();

      const response = await request(app.getHttpServer())
        .post('/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ roomId, startTime: iso(3600_000), endTime: iso(100_000_000) })
        .expect(400);

      expect((response.body as ErrorResponse).message).toContain('24 horas');
    });

    it('should return 404 when the room does not exist', async () => {
      const app = getApp();

      const response = await request(app.getHttpServer())
        .post('/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          roomId: '00000000-0000-0000-0000-000000000000',
          startTime: iso(3600_000),
          endTime: iso(7200_000),
        })
        .expect(404);

      expect((response.body as ErrorResponse).message).toContain(
        'Sala não encontrada',
      );
    });

    it('should return 401 when not authenticated', async () => {
      const app = getApp();

      await request(app.getHttpServer())
        .post('/reservations')
        .send({ roomId, startTime: iso(3600_000), endTime: iso(7200_000) })
        .expect(401);
    });
  });

  describe('GET /reservations', () => {
    it('should list only the authenticated user reservations', async () => {
      const app = getApp();
      const created = await createReservation(
        userToken,
        iso(3600_000),
        iso(7200_000),
      );

      const response = await request(app.getHttpServer())
        .get('/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const body = response.body as {
        data: ReservationResponse[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
      expect(body.total).toBe(1);
      expect(body.data[0]?.id).toBe(created.id);
      expect(body.page).toBe(1);
      expect(body.limit).toBe(10);

      const otherResponse = await request(app.getHttpServer())
        .get('/reservations')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(200);

      expect((otherResponse.body as { total: number }).total).toBe(0);
    });
  });

  describe('GET /reservations/:id', () => {
    it('should return the reservation for its owner', async () => {
      const app = getApp();
      const created = await createReservation(
        userToken,
        iso(3600_000),
        iso(7200_000),
      );

      const response = await request(app.getHttpServer())
        .get(`/reservations/${created.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const body = response.body as ReservationResponse;
      expect(body.id).toBe(created.id);
      expect(body.room?.id).toBe(roomId);
      expect(body.user?.email).toBe('user@example.com');
    });

    it('should return the reservation for an admin', async () => {
      const app = getApp();
      const created = await createReservation(
        userToken,
        iso(3600_000),
        iso(7200_000),
      );

      await request(app.getHttpServer())
        .get(`/reservations/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should return 403 for another user', async () => {
      const app = getApp();
      const created = await createReservation(
        userToken,
        iso(3600_000),
        iso(7200_000),
      );

      const response = await request(app.getHttpServer())
        .get(`/reservations/${created.id}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);

      expect((response.body as ErrorResponse).message).toContain('permissão');
    });

    it('should return 404 for a non-existent reservation', async () => {
      const app = getApp();

      await request(app.getHttpServer())
        .get('/reservations/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
  });

  describe('PATCH /reservations/:id/cancel', () => {
    it('should cancel a future reservation owned by the user', async () => {
      const app = getApp();
      const created = await createReservation(
        userToken,
        iso(3600_000),
        iso(7200_000),
      );

      const response = await request(app.getHttpServer())
        .patch(`/reservations/${created.id}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect((response.body as ReservationResponse).status).toBe('CANCELLED');
    });

    it('should return 409 when cancelling an already cancelled reservation', async () => {
      const app = getApp();
      const created = await createReservation(
        userToken,
        iso(3600_000),
        iso(7200_000),
      );

      await request(app.getHttpServer())
        .patch(`/reservations/${created.id}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const response = await request(app.getHttpServer())
        .patch(`/reservations/${created.id}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(409);

      expect((response.body as ErrorResponse).message).toContain('cancelada');
    });

    it('should return 409 when the reservation already started', async () => {
      const app = getApp();
      const prisma = getPrismaService();
      const reservation = await prisma.reservation.create({
        data: {
          userId: regularUserId,
          roomId,
          startTime: new Date(Date.now() - 7200_000),
          endTime: new Date(Date.now() - 3600_000),
        },
      });

      const response = await request(app.getHttpServer())
        .patch(`/reservations/${reservation.id}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(409);

      expect((response.body as ErrorResponse).message).toContain('iniciada');
    });

    it('should return 403 when a different user tries to cancel', async () => {
      const app = getApp();
      const created = await createReservation(
        userToken,
        iso(3600_000),
        iso(7200_000),
      );

      const response = await request(app.getHttpServer())
        .patch(`/reservations/${created.id}/cancel`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);

      expect((response.body as ErrorResponse).message).toContain('permissão');
    });
  });

  describe('GET /reservations/schedule/weekly', () => {
    it('should return the weekly schedule containing the reservation', async () => {
      const app = getApp();
      const created = await createReservation(
        userToken,
        iso(3600_000),
        iso(7200_000),
      );

      const now = new Date();
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;
      const monday = new Date(now);
      monday.setDate(now.getDate() - diff);
      monday.setHours(0, 0, 0, 0);

      const response = await request(app.getHttpServer())
        .get(`/reservations/schedule/weekly?weekStart=${monday.toISOString()}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const body = response.body as {
        weekStart: string;
        reservations: ReservationResponse[];
      };
      expect(new Date(body.weekStart).toISOString()).toBe(monday.toISOString());
      const ids = body.reservations.map((r) => r.id);
      expect(ids).toContain(created.id);
    });
  });

  describe('GET /reservations/export/csv', () => {
    it('should return a CSV file with header and data', async () => {
      const app = getApp();
      const prisma = getPrismaService();
      const maliciousRoom = await prisma.room.create({
        data: { name: '=cmd|perigo', capacity: 5 },
      });
      await createReservationForRoom(
        userToken,
        maliciousRoom.id,
        iso(3600_000),
        iso(7200_000),
      );

      const response = await request(app.getHttpServer())
        .get('/reservations/export/csv')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      const csv: string = response.text;
      expect(csv).toContain('id,sala,usuario,email,inicio,fim,status');
      expect(csv).toContain("'=cmd|perigo");
    });
  });

  describe('GET /reservations/history', () => {
    it('should return only past reservations', async () => {
      const app = getApp();
      const prisma = getPrismaService();
      const past = await prisma.reservation.create({
        data: {
          userId: regularUserId,
          roomId,
          startTime: new Date(Date.now() - 7200_000),
          endTime: new Date(Date.now() - 3600_000),
        },
      });
      const future = await createReservation(
        userToken,
        iso(3600_000),
        iso(7200_000),
      );

      const response = await request(app.getHttpServer())
        .get('/reservations/history')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const body = response.body as { data: ReservationResponse[] };
      const ids = body.data.map((r) => r.id);
      expect(ids).toContain(past.id);
      expect(ids).not.toContain(future.id); // future reservation must not appear
    });
  });

  describe('Admin endpoints', () => {
    it('GET /reservations/stats should return totals for admins', async () => {
      const app = getApp();
      await createReservation(userToken, iso(3600_000), iso(7200_000));

      const response = await request(app.getHttpServer())
        .get('/reservations/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = response.body as {
        totalRooms: number;
        totalReservations: number;
        activeToday: number;
        cancellationRate: number;
        topRooms: { roomId: string; name: string; count: number }[];
      };
      expect(body.totalReservations).toBeGreaterThanOrEqual(1);
      expect(body.totalRooms).toBeGreaterThanOrEqual(1);
      expect(typeof body.cancellationRate).toBe('number');
      expect(Array.isArray(body.topRooms)).toBe(true);
    });

    it('GET /reservations/stats should return 403 for regular users', async () => {
      const app = getApp();

      const response = await request(app.getHttpServer())
        .get('/reservations/stats')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect((response.body as ErrorResponse).message).toContain('permissão');
    });

    it('GET /reservations/admin should list all reservations for admins', async () => {
      const app = getApp();
      await createReservation(userToken, iso(3600_000), iso(7200_000));

      const response = await request(app.getHttpServer())
        .get('/reservations/admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = response.body as {
        data: ReservationResponse[];
        total: number;
      };
      expect(body.total).toBeGreaterThanOrEqual(1);
      expect(body.data[0]?.user?.email).toBe('user@example.com');
    });

    it('GET /reservations/admin should return 403 for regular users', async () => {
      const app = getApp();

      const response = await request(app.getHttpServer())
        .get('/reservations/admin')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect((response.body as ErrorResponse).message).toContain('permissão');
    });
  });

  describe('Favorites', () => {
    it('should toggle a room as favorite and list it', async () => {
      const app = getApp();

      const first = await request(app.getHttpServer())
        .post(`/favorites/${roomId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(201);
      expect((first.body as { favorited: boolean }).favorited).toBe(true);

      const list = await request(app.getHttpServer())
        .get('/favorites')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      const rooms = list.body as { id: string; name: string }[];
      expect(rooms.map((r) => r.id)).toContain(roomId);

      const second = await request(app.getHttpServer())
        .post(`/favorites/${roomId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(201);
      expect((second.body as { favorited: boolean }).favorited).toBe(false);

      const listAfter = await request(app.getHttpServer())
        .get('/favorites')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      expect(
        (listAfter.body as { id: string }[]).map((r) => r.id),
      ).not.toContain(roomId);
    });

    it('should return 404 when favoriting a non-existent room', async () => {
      const app = getApp();

      await request(app.getHttpServer())
        .post('/favorites/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
  });

  describe('Cookie-based authentication', () => {
    it('should set httpOnly cookies on login and work with cookies only', async () => {
      const app = getApp();

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'user@example.com', password: 'User123!' })
        .expect(200);

      const setCookie = (loginResponse.headers['set-cookie'] ?? []) as string[];
      const accessCookie = setCookie.find((c) => c.startsWith('access_token='));
      const refreshCookie = setCookie.find((c) =>
        c.startsWith('refresh_token='),
      );

      expect(accessCookie).toBeDefined();
      expect(refreshCookie).toBeDefined();
      expect(accessCookie).toContain('HttpOnly');
      expect(refreshCookie).toContain('HttpOnly');

      const accessValue = accessCookie?.split(';')[0];
      const refreshValue = refreshCookie?.split(';')[0];
      expect(accessValue).toBeDefined();
      expect(refreshValue).toBeDefined();

      // /user/me works with ONLY cookies — no Authorization header
      const meResponse = await request(app.getHttpServer())
        .get('/user/me')
        .set('Cookie', `${accessValue}; ${refreshValue}`)
        .expect(200);

      expect((meResponse.body as { email: string }).email).toBe(
        'user@example.com',
      );
    });

    it('should clear cookies on logout and invalidate the refresh token', async () => {
      const app = getApp();

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'user@example.com', password: 'User123!' })
        .expect(200);

      const setCookie = (loginResponse.headers['set-cookie'] ?? []) as string[];
      const accessValue = setCookie
        .find((c) => c.startsWith('access_token='))
        ?.split(';')[0];
      const refreshValue = setCookie
        .find((c) => c.startsWith('refresh_token='))
        ?.split(';')[0];
      expect(accessValue).toBeDefined();
      expect(refreshValue).toBeDefined();

      const logoutResponse = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', `${accessValue}; ${refreshValue}`)
        .expect(204);

      const logoutCookies = (logoutResponse.headers['set-cookie'] ??
        []) as string[];
      expect(logoutCookies.some((c) => c.startsWith('access_token=;'))).toBe(
        true,
      );
      expect(logoutCookies.some((c) => c.startsWith('refresh_token=;'))).toBe(
        true,
      );

      // Old refresh token must no longer work
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${refreshValue?.split('=')[1]}`)
        .expect(401);

      expect((refreshResponse.body as ErrorResponse).message).toBeDefined();
    });
  });

  describe('Reservation status flow', () => {
    it('should keep CONFIRMED status as default', async () => {
      const prisma = getPrismaService();

      const created = await createReservation(
        userToken,
        iso(3600_000),
        iso(7200_000),
      );

      const inDb = await prisma.reservation.findUnique({
        where: { id: created.id },
      });
      expect(inDb?.status).toBe(ReservationStatus.CONFIRMED);
    });
  });
});
