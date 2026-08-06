import request from 'supertest';
import {
  getApp,
  getPrismaService,
  createTestUser,
} from '@test/setup/e2e.setup';

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

interface RoomResponse {
  id: string;
  name: string;
  description?: string | null;
  capacity: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

describe('Rooms (e2e)', () => {
  let adminToken: string;
  let userToken: string;
  let regularUserId: string;

  const login = async (email: string, password: string): Promise<string> => {
    const app = getApp();
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    return (response.body as LoginResponse).access_token;
  };

  const createRoom = async (
    name: string,
    capacity = 10,
    token = adminToken,
  ): Promise<RoomResponse> => {
    const app = getApp();
    const response = await request(app.getHttpServer())
      .post('/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send({ name, capacity, description: 'Sala criada nos testes e2e' })
      .expect(201);
    return response.body as RoomResponse;
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
    regularUserId = regularUser.id;
    expect(admin.id).toBeDefined();

    adminToken = await login('admin@example.com', 'Admin123!');
    userToken = await login('user@example.com', 'User123!');
  });

  afterEach(async () => {
    const prisma = getPrismaService();
    await prisma.reservation.deleteMany({});
    await prisma.favorite.deleteMany({});
    await prisma.room.deleteMany({});
  });

  describe('POST /rooms', () => {
    it('should create a room when authenticated as admin', async () => {
      const app = getApp();

      const response = await request(app.getHttpServer())
        .post('/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Sala Executiva',
          capacity: 12,
          description: 'Sala com videoconferência',
          resources: ['projetor', 'tv'],
        })
        .expect(201);

      const body = response.body as RoomResponse;
      expect(body).toHaveProperty('id');
      expect(body.name).toBe('Sala Executiva');
      expect(body.capacity).toBe(12);
      expect(body.status).toBe('AVAILABLE');
    });

    it('should return 403 when authenticated as a regular user', async () => {
      const app = getApp();

      const response = await request(app.getHttpServer())
        .post('/rooms')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Sala Proibida', capacity: 5 })
        .expect(403);

      const body = response.body as ErrorResponse;
      expect(body.message).toContain('permissão');
    });

    it('should return 401 when not authenticated', async () => {
      const app = getApp();

      await request(app.getHttpServer())
        .post('/rooms')
        .send({ name: 'Sala Anônima', capacity: 5 })
        .expect(401);
    });

    it('should return 409 when the room name is duplicated', async () => {
      const app = getApp();
      await createRoom('Sala Única');

      const response = await request(app.getHttpServer())
        .post('/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Sala Única', capacity: 10 })
        .expect(409);

      expect((response.body as ErrorResponse).message).toBeDefined();
    });

    it('should return 400 for invalid payload', async () => {
      const app = getApp();

      const response = await request(app.getHttpServer())
        .post('/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'X', capacity: 0 })
        .expect(400);

      expect((response.body as ErrorResponse).message).toBeDefined();
    });
  });

  describe('GET /rooms', () => {
    it('should list rooms with pagination metadata', async () => {
      const app = getApp();
      await createRoom('Sala Paginação 1');
      await createRoom('Sala Paginação 2');
      await createRoom('Sala Paginação 3');

      const response = await request(app.getHttpServer())
        .get('/rooms?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = response.body as {
        data: RoomResponse[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
      expect(body.data).toHaveLength(2);
      expect(body.total).toBe(3);
      expect(body.page).toBe(1);
      expect(body.limit).toBe(2);
      expect(body.totalPages).toBe(2);
    });

    it('should filter rooms by search term', async () => {
      const app = getApp();
      await createRoom('Sala Alfa');
      await createRoom('Sala Beta');

      const response = await request(app.getHttpServer())
        .get('/rooms?search=alfa')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = response.body as { data: RoomResponse[] };
      expect(body.data).toHaveLength(1);
      expect(body.data[0]?.name).toBe('Sala Alfa');
    });

    it('should filter rooms by minCapacity', async () => {
      const app = getApp();
      await createRoom('Sala Pequena', 5);
      await createRoom('Sala Grande', 15);

      const response = await request(app.getHttpServer())
        .get('/rooms?minCapacity=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = response.body as { data: RoomResponse[] };
      expect(body.data).toHaveLength(1);
      expect(body.data[0]?.capacity).toBe(15);
    });

    it('should return 401 when not authenticated', async () => {
      const app = getApp();

      await request(app.getHttpServer()).get('/rooms').expect(401);
    });
  });

  describe('GET /rooms/:id', () => {
    it('should return the room by id', async () => {
      const app = getApp();
      const created = await createRoom('Sala por Id');

      const response = await request(app.getHttpServer())
        .get(`/rooms/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = response.body as RoomResponse;
      expect(body.id).toBe(created.id);
      expect(body.name).toBe('Sala por Id');
    });

    it('should return 404 for a non-existent room', async () => {
      const app = getApp();

      const response = await request(app.getHttpServer())
        .get('/rooms/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect((response.body as ErrorResponse).message).toContain(
        'Sala não encontrada',
      );
    });
  });

  describe('PATCH /rooms/:id', () => {
    it('should update a room as admin', async () => {
      const app = getApp();
      const created = await createRoom('Sala a Atualizar');

      const response = await request(app.getHttpServer())
        .patch(`/rooms/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Sala Atualizada', capacity: 20 })
        .expect(200);

      const body = response.body as RoomResponse;
      expect(body.name).toBe('Sala Atualizada');
      expect(body.capacity).toBe(20);
    });

    it('should return 403 when a regular user tries to update', async () => {
      const app = getApp();
      const created = await createRoom('Sala Sem Permissão');

      await request(app.getHttpServer())
        .patch(`/rooms/${created.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Hackeada' })
        .expect(403);
    });

    it('should return 409 when deactivating a room with future reservations', async () => {
      const app = getApp();
      const prisma = getPrismaService();
      const created = await createRoom('Sala em Manutenção');

      await prisma.reservation.create({
        data: {
          userId: regularUserId,
          roomId: created.id,
          startTime: new Date(Date.now() + 3600_000),
          endTime: new Date(Date.now() + 7200_000),
        },
      });

      const response = await request(app.getHttpServer())
        .patch(`/rooms/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'MAINTENANCE' })
        .expect(409);

      expect((response.body as ErrorResponse).message).toContain(
        'reservas futuras',
      );
    });

    it('should allow deactivating a room without future reservations', async () => {
      const app = getApp();
      const created = await createRoom('Sala Livre');

      const response = await request(app.getHttpServer())
        .patch(`/rooms/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'INACTIVE' })
        .expect(200);

      expect((response.body as RoomResponse).status).toBe('INACTIVE');
    });
  });

  describe('DELETE /rooms/:id', () => {
    it('should delete a room as admin', async () => {
      const app = getApp();
      const created = await createRoom('Sala a Excluir');

      const response = await request(app.getHttpServer())
        .delete(`/rooms/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect((response.body as { message: string }).message).toContain(
        'Sala excluída',
      );

      await request(app.getHttpServer())
        .get(`/rooms/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 409 when the room has future reservations', async () => {
      const app = getApp();
      const prisma = getPrismaService();
      const created = await createRoom('Sala com Reservas');

      await prisma.reservation.create({
        data: {
          userId: regularUserId,
          roomId: created.id,
          startTime: new Date(Date.now() + 3600_000),
          endTime: new Date(Date.now() + 7200_000),
        },
      });

      const response = await request(app.getHttpServer())
        .delete(`/rooms/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);

      expect((response.body as ErrorResponse).message).toContain(
        'reservas futuras',
      );
    });

    it('should return 404 for a non-existent room', async () => {
      const app = getApp();

      await request(app.getHttpServer())
        .delete('/rooms/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 403 when a regular user tries to delete', async () => {
      const app = getApp();
      const created = await createRoom('Sala Blindada');

      await request(app.getHttpServer())
        .delete(`/rooms/${created.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });
});
