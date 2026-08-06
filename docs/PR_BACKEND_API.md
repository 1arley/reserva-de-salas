# PR — Backend: API de Reserva de Salas (NestJS + Prisma + PostgreSQL)

> Proposta pronta para abertura. Título sugerido: **`feat(backend): add room reservation system API`**

---

## Resumo

Implementação completa do backend do Sistema Web de Reserva de Salas sobre o scaffold NestJS existente. A PR adiciona o domínio de salas (`Room`), reservas (`Reservation`) e favoritos (`Favorite`) com Prisma + PostgreSQL, autenticação JWT via cookies `httpOnly` (com fallback para Bearer header), autorização por papéis (`USER` / `ADMIN` / `SUPERADMIN`), validações de negócio (conflito de horário, duração máxima, regras de status) e cobertura de testes unitários + e2e.

Frontend (Next.js) permanece como scaffold — integração é o próximo passo (ver [Próximos passos](#próximos-passos)).

## O que está incluído

### Banco de dados (Prisma)

- **Novos modelos**:
  - `Room` — `name` único, `capacity`, `description`, `resources[]`, `status` (`AVAILABLE` / `MAINTENANCE` / `INACTIVE`), índices em `status` e `capacity`.
  - `Reservation` — `userId`, `roomId`, `startTime`, `endTime`, `status` (`CONFIRMED` / `CANCELLED`), `notes`, índices em `userId`, `roomId`, `[startTime, endTime]` e `status`.
  - `Favorite` — chave composta única `(userId, roomId)`, relação com `Room` e `User`.
- **2 novas migrations**: `add_room_reservation_favorite` e `room_name_unique` (nome de sala único).
- **Seed atualizado**: 4 salas (Alpha, Beta, Gamma, Delta) + 2 usuários de teste (admin e regular). `seed.ts` migrado para Prisma 7 com driver adapter (`@prisma/adapter-pg`).

### Autenticação por cookies

- `src/common/utils/cookie.util.ts` — `setAuthCookies` / `clearAuthCookies`: cookies `access_token` e `refresh_token` com `httpOnly`, `secure` em produção, `sameSite: strict` (prod) / `lax` (dev), `maxAge` derivado de `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN`.
- `jwt.strategy.ts` / `jwt-refresh.strategy.ts` — extração do token do cookie `httpOnly` **ou** do header `Authorization: Bearer`.
- `auth.controller.ts` — `login` e `refresh` agora definem os cookies na resposta; novo **`POST /auth/logout`** (revoga o refresh token por hash SHA-256 e limpa os cookies — funciona mesmo com access token expirado).
- `main.ts` — `cookieParser()`, CORS com `credentials`, Swagger atualizado (título "Reserva de Salas API", tags `rooms`, `reservations`, `favorites`).
- Correções: bug de expiração do refresh token (30m era interpretado como 30h) e remoção de código morto em `auth.service` (`validateRefreshToken`, `revokeRefreshToken`).

### Módulo de salas (`src/room/`)

- `GET /api/rooms` — filtros: `search` (case-insensitive), `minCapacity`, `status`, `availableFrom`/`availableTo` (exclui salas com reserva confirmada sobreposta), paginação.
- `GET /api/rooms/:id`, `POST`, `PATCH`, `DELETE` — CRUD restrito a `ADMIN`/`SUPERADMIN` via `RolesGuard`.
- Regras de negócio: mudança de status para não-`AVAILABLE` bloqueada quando existem reservas futuras ativas; exclusão bloqueada nas mesmas condições; nome duplicado → `409` (mapeado pelo filtro global de erros Prisma).

### Módulo de reservas (`src/reservation/`)

- `POST /api/reservations` — criação com detecção de conflito **dentro de transação `Serializable`** (sem race condition de double-booking), rejeição de horário passado e duração máxima de 24h.
- `GET /api/reservations` (próprias), `GET /:id` (owner/admin), `PATCH /:id/cancel` (owner/admin), `GET schedule/weekly`, `GET history`, `GET export/csv` (sanitização de CSV injection), `GET stats` (admin), `GET admin` (admin).

### Módulo de favoritos (`src/favorite/`)

- `POST /api/favorites/:roomId` — toggle atômico (criação + catch de `P2002` para remover).
- `GET /api/favorites` — lista as salas favoritas do usuário.

### Infra comum

- `HttpExceptionFilter` — mapeia Prisma `P2002` → `409 Conflict` e `P2025` → `404 Not Found`; formato de erro padronizado `{ statusCode, timestamp, path, message }`.
- Helper de paginação nos módulos de sala e reserva.

## Endpoints

Prefixo global: `/api` (configurável via `API_PREFIX`).

| Método | Rota | Descrição | Autenticação |
|---|---|---|---|
| `POST` | `/api/auth/register` | Cadastro de usuário | Pública |
| `POST` | `/api/auth/login` | Login (define cookies + retorna tokens) | Pública |
| `POST` | `/api/auth/refresh` | Renova tokens (cookies/Bearer) | Refresh guard |
| `POST` | `/api/auth/logout` | Revoga refresh token e limpa cookies | Pública (lê cookie/Bearer) |
| `GET` | `/api/user` | Lista usuários (paginado) | JWT |
| `GET` | `/api/user/me` | Perfil do usuário logado | JWT |
| `GET` | `/api/rooms` | Lista salas com filtros | JWT |
| `GET` | `/api/rooms/:id` | Detalhe de sala | JWT |
| `POST` | `/api/rooms` | Cria sala | ADMIN / SUPERADMIN |
| `PATCH` | `/api/rooms/:id` | Atualiza sala | ADMIN / SUPERADMIN |
| `DELETE` | `/api/rooms/:id` | Exclui sala | ADMIN / SUPERADMIN |
| `POST` | `/api/reservations` | Cria reserva (com conflito detectado) | JWT |
| `GET` | `/api/reservations` | Lista reservas do usuário | JWT |
| `GET` | `/api/reservations/schedule/weekly` | Agenda semanal (todas as salas) | JWT |
| `GET` | `/api/reservations/history` | Histórico do usuário | JWT |
| `GET` | `/api/reservations/export/csv` | Exporta CSV (admin: todas) | JWT |
| `GET` | `/api/reservations/stats` | Estatísticas do dashboard | ADMIN / SUPERADMIN |
| `GET` | `/api/reservations/admin` | Lista todas as reservas | ADMIN / SUPERADMIN |
| `GET` | `/api/reservations/:id` | Detalhe (owner/admin) | JWT |
| `PATCH` | `/api/reservations/:id/cancel` | Cancela reserva (owner/admin) | JWT |
| `GET` | `/api/favorites` | Salas favoritas | JWT |
| `POST` | `/api/favorites/:roomId` | Toggle favorito | JWT |

Referência completa (DTOs, respostas, erros): [docs/API.md](./API.md).

## Resultados de testes

| Suite | Testes | Status |
|---|---|---|
| Unit — `room.service.spec` | 19 | ✅ passando |
| Unit — `reservation.service.spec` | 32 | ✅ passando |
| Unit — `favorite.service.spec` | 6 | ✅ passando |
| Unit — `cookie.util.spec` | 6 | ✅ passando |
| Unit — demais specs (auth, user, prisma, app) | 38 | ✅ passando |
| **Total unit** | **101** | ✅ |
| E2E — `rooms.e2e-spec` | 19 | ✅ passando |
| E2E — `reservations.e2e-spec` | 29 | ✅ passando |
| E2E — `auth.e2e-spec` | 21 | ✅ passando |
| E2E — `app.e2e-spec` | 1 | ✅ passando |
| **Total e2e** | **70** | ✅ |

Comando: `npm run test:all` (dentro de `backend/`).

## Screenshots

N/A — API sem UI nesta PR. Documentação interativa disponível via Swagger: `http://localhost:3000/api/docs` (ver [Como rodar localmente](#como-rodar-localmente)).

## Como rodar localmente

Pré-requisito: Docker + Docker Compose.

```bash
cd backend

# 1. Configuração (valores padrão já funcionam com docker compose)
cp .env.example .env

# 2. Sobe banco + API
#    O container executa automaticamente: npm install, prisma generate, prisma migrate deploy
docker compose up -d

# 3. Seed (salas + usuários de teste) — obrigatório para usar a API
docker compose exec app npm run seed

# 4. Acessos
#    API:      http://localhost:3000/api
#    Swagger:  http://localhost:3000/api/docs
```

Contas de teste criadas pelo seed:

| Papel | Email | Senha |
|---|---|---|
| ADMIN | `admin@example.com` | `Admin123!` |
| USER | `user@example.com` | `User123!` |

## Próximos passos

1. **Integração frontend (Next.js)** — consumir a API com `credentials: 'include'` para autenticação via cookies; `CORS_ORIGIN` já configurado para `http://localhost:3000`/`4200` com `CORS_CREDENTIALS=true`.
2. Telas: login/registro, listagem de salas com filtros, criação/cancelamento de reservas, calendário semanal, histórico, favoritos.
3. Painel administrativo: CRUD de salas, estatísticas e listagem geral de reservas.
4. Fluxo de refresh automático do token no cliente (interceptador de respostas `401`).
