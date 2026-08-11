#!/bin/sh
set -e

echo "==> Running Prisma migrations..."
npx prisma migrate deploy

echo "==> Seeding database (if initial run)..."
npx tsx prisma/seed.ts || echo "Seed skipped or already executed"

echo "==> Starting NestJS application..."
exec node dist/main.js
