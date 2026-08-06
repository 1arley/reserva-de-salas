import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const databaseUrl =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@postgres:5432/seedabit_db?schema=public';

const adapter = new PrismaPg(new Pool({ connectionString: databaseUrl }));
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting database seeding...');

  // Hash passwords
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const userPassword = await bcrypt.hash('User123!', 10);

  // Create test users
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      id: '1',
      email: 'admin@example.com',
      password: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
    },
  });

  await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      id: '2',
      email: 'user@example.com',
      password: userPassword,
      name: 'Regular User',
      role: 'USER',
    },
  });

  const rooms = [
    {
      name: 'Sala Alpha',
      description: 'Sala para reuniões de até 8 pessoas com projetor.',
      capacity: 8,
      resources: ['projetor', 'tv'],
    },
    {
      name: 'Sala Beta',
      description: 'Sala para treinamentos com videoconferência.',
      capacity: 12,
      resources: ['whiteboard', 'videoconferencia'],
    },
    {
      name: 'Sala Gamma',
      description: 'Sala compacta para reuniões rápidas.',
      capacity: 4,
      resources: ['monitor'],
    },
    {
      name: 'Sala Delta',
      description: 'Auditório com som e microfone.',
      capacity: 20,
      resources: ['projetor', 'som', 'microfone'],
    },
  ];

  for (const room of rooms) {
    await prisma.room.upsert({
      where: { name: room.name },
      update: room,
      create: room,
    });
  }

  console.log('Database seeded successfully!');
  console.log('Admin: admin@example.com / Admin123!');
  console.log('User: user@example.com / User123!');
  console.log(`Rooms: ${rooms.map((r) => r.name).join(', ')}`);
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });