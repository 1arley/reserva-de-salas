# Mensagens de Commit — Backend API de Reserva de Salas

> Formato: [Conventional Commits](https://www.conventionalcommits.org/) (o repositório já usa `@commitlint/config-conventional` via husky).
> Ordem sugerida: cada commit é aplicável isoladamente e mantém o projeto em estado funcional.

---

## 1. `feat(db): add room, reservation and favorite models`

```text
feat(db): add room, reservation and favorite models

Add Prisma models for the reservation system domain and the two
migrations that ship them (add_room_reservation_favorite,
room_name_unique).

- Room: unique name, capacity, description, resources[], status
  enum (AVAILABLE/MAINTENANCE/INACTIVE), indexed by status/capacity
- Reservation: userId/roomId relations, startTime/endTime range,
  status enum (CONFIRMED/CANCELLED), notes; composite index on
  (startTime, endTime) for conflict queries
- Favorite: composite unique (userId, roomId) so toggle is atomic
  via a P2002 catch instead of a read-then-write race
- Update seed for Prisma 7 driver adapter (PrismaPg) and add sample
  rooms plus admin/user test accounts
- Map Prisma P2002 -> 409 and P2025 -> 404 in the global
  HttpExceptionFilter so DB-level integrity errors surface as
  proper HTTP responses
```

**Por quê:** a modelagem define o contrato de integridade do domínio — unicidade de nome de sala e de favorito, e o índice de intervalo que sustenta a detecção de conflito de reservas. O seed com contas de teste destrava o desenvolvimento do frontend imediatamente.

---

## 2. `feat(auth): add cookie-based JWT session support`

```text
feat(auth): add cookie-based JWT session support

Set access/refresh JWT cookies on login and refresh, and clear them
on the new logout endpoint, so browser clients can authenticate
without storing tokens in JS.

- Add cookie.util with setAuthCookies/clearAuthCookies: httpOnly,
  secure in production, sameSite strict (prod)/lax (dev), maxAge
  derived from JWT_ACCESS_EXPIRES_IN/JWT_REFRESH_EXPIRES_IN
- Extract tokens from httpOnly cookies first, Bearer header as
  fallback, in both jwt.strategy and jwt-refresh.strategy
- Add POST /auth/logout: revokes the refresh token by SHA-256 hash
  (works even when the access token has expired) and clears cookies
- Wire cookie-parser and credentials CORS in main.ts; rename Swagger
  to "Reserva de Salas API" and add rooms/reservations/favorites tags
- Fix refresh token expiry: minutes were parsed as hours, so a 30m
  token lived 30h; expiresAt now honors s/m/h/d suffixes
- Remove dead code in auth.service (validateRefreshToken,
  revokeRefreshToken)
```

**Por quê:** manter os tokens fora do JS mitiga XSS; o cookie `httpOnly` é o padrão para SPA. O logout idempotente por hash garante revogação efetiva do refresh token mesmo sem sessão válida de acesso.

---

## 3. `feat(rooms): add room management API with admin protection`

```text
feat(rooms): add room management API with admin protection

CRUD of rooms behind JwtAuthGuard + RolesGuard (ADMIN/SUPERADMIN
for mutations), with listing filters and business rules.

- GET /api/rooms: search (case-insensitive), minCapacity, status,
  availableFrom/availableTo (excludes rooms with overlapping
  confirmed reservations), paginated
- GET /api/rooms/:id, POST, PATCH, DELETE (admin only)
- Block status change away from AVAILABLE and block deletion while
  future confirmed reservations exist (409)
- Duplicate room name surfaces as 409 via the global P2002 mapping
- 19 unit tests (room.service.spec) + 19 e2e tests (rooms.e2e-spec)
```

**Por quê:** a disponibilidade é o coração do domínio — os filtros de intervalo permitem ao frontend responder "quais salas estão livres às 14h–15h?" em uma chamada. As regras de bloqueio impedem admin de quebrar reservas já confirmadas.

---

## 4. `feat(reservations): add reservation lifecycle with conflict prevention`

```text
feat(reservations): add reservation lifecycle with conflict prevention

Full reservation flow plus the favorites module.

- POST /api/reservations: validates end > start, start in the future,
  max 24h duration, room exists and is AVAILABLE; conflict check runs
  inside a Serializable transaction so concurrent bookings cannot
  double-book a room
- GET own list, GET :id (owner/admin), PATCH :id/cancel (owner/admin;
  rejects already-cancelled or already-started), schedule/weekly,
  history, export/csv (CSV-injection sanitized, admin exports all),
  stats (admin), admin list (admin)
- Favorites: POST /api/favorites/:roomId atomic toggle (P2002 catch),
  GET /api/favorites
- 38 unit tests (reservation 32, favorite 6) + 29 e2e tests
  (reservations.e2e-spec)
```

**Por quê:** o requisito central do desafio é impedir reservas conflitantes. A transação `Serializable` garante isso sob concorrência — a checagem fora da transação deixaria uma janela de race. Cancelamento restrito ao dono/admin preserva o controle; CSV sanitizado evita fórmula injection ao abrir em planilhas.

---

## Opcional — commit de documentação

Se a PR incluir a documentação gerada nesta entrega:

```text
docs(backend): document reservation system API

- Rewrite root README in Portuguese: stack, structure, endpoints,
  cookie auth, docker setup, env vars, seed accounts, tests
- Add docs/API.md (full endpoint reference) and
  docs/PR_BACKEND_API.md (PR proposal)
```

---

## Notas

- **Separação alternativa:** o módulo de favoritos pode ser extraído em um quinto commit `feat(favorites): add room favorites toggle` — recomendado se a revisão preferir granularidade máxima.
- **Escopo dos commits:** `app.module.ts` é tocado incrementalmente (registro de cada módulo no commit correspondente). `package.json`/`package-lock.json` ganham `cookie-parser` no commit 2.
- **Estilo do repositório:** histórico atual usa mensagens descritivas de uma linha ("Add project scaffold: NestJS backend and Next.js frontend"); os commits acima seguem a mesma convenção com corpo explicativo, alinhado ao `commitlint` já configurado.
