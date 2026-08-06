# Sistema Web de Reserva de Salas

Sistema para informatizar o processo de reserva de salas de reunião, substituindo o controle por planilhas. Colaboradores consultam a disponibilidade das salas, criam e cancelam reservas; administradores gerenciam o catálogo de salas e acompanham estatísticas.

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | NestJS 11, TypeScript, Prisma 7 ORM |
| Banco de dados | PostgreSQL 15 |
| Frontend | Next.js, React, TypeScript, TailwindCSS |
| Autenticação | JWT (access + refresh) via cookies `httpOnly` |
| Documentação | Swagger (OpenAPI) |
| Testes | Jest (unit + e2e com Supertest) |

## Estrutura do projeto

```
reserva-de-salas/
├── backend/                      # API NestJS (código-fonte)
│   ├── prisma/
│   │   ├── schema.prisma         # Modelos: User, RefreshToken, Room, Reservation, Favorite
│   │   ├── migrations/           # Migrations SQL versionadas
│   │   └── seed.ts               # Salas e usuários de teste
│   ├── src/
│   │   ├── auth/                 # Login, registro, refresh, logout, guards JWT
│   │   ├── user/                 # Perfil e listagem de usuários
│   │   ├── room/                 # CRUD de salas + filtros de disponibilidade
│   │   ├── reservation/          # Ciclo de vida das reservas, agenda, histórico, CSV, stats
│   │   ├── favorite/             # Toggle de salas favoritas
│   │   └── common/               # Filtro de exceções, cookies, enums, paginação
│   ├── test/                     # Suites e2e (rooms, reservations, auth)
│   ├── docker-compose.yml        # API + PostgreSQL (+ pgAdmin via profile)
│   └── .env.example              # Modelo de variáveis de ambiente
├── frontend/
│   └── nextjs-react-typescript/  # SPA Next.js (scaffold — integração em andamento)
└── docs/                         # Documentação da entrega
    ├── API.md                    # Referência completa dos endpoints
    ├── PR_BACKEND_API.md         # Proposta de PR (backend)
    └── COMMITS.md                # Mensagens de commit sugeridas
```

## Funcionalidades do backend

- **Autenticação** — registro, login, refresh e logout; JWT em cookies `httpOnly` (com fallback para Bearer header).
- **Salas** — listagem com filtros (busca por nome, capacidade mínima, status, intervalo de disponibilidade), CRUD restrito a administradores.
- **Reservas** — criação com validação de conflito de horário (transação `Serializable`, sem double-booking), cancelamento, agenda semanal, histórico, exportação CSV e estatísticas.
- **Favoritos** — toggle atômico de salas favoritas por usuário.
- **Tratamento de erros** — formato padronizado `{ statusCode, timestamp, path, message }`; erros Prisma mapeados (`P2002` → `409`, `P2025` → `404`).

## Autenticação por cookies

`POST /api/auth/login` e `POST /api/auth/refresh` definem dois cookies `httpOnly` na resposta:

| Cookie | Conteúdo | Expiração (padrão) |
|---|---|---|
| `access_token` | JWT de acesso | `JWT_ACCESS_EXPIRES_IN` (15m) |
| `refresh_token` | JWT de renovação | `JWT_REFRESH_EXPIRES_IN` (7d) |

- `httpOnly: true` — tokens inacessíveis a JavaScript (proteção contra XSS).
- `secure: true` e `sameSite: strict` em produção; `lax` em desenvolvimento.
- O cliente pode enviar o JWT também via header `Authorization: Bearer <token>`.
- `POST /api/auth/logout` revoga o refresh token no servidor (hash SHA-256) e limpa os cookies — funciona mesmo com access token expirado.
- O frontend deve fazer requisições com `credentials: 'include'` (CORS já configurado via `CORS_ORIGIN` + `CORS_CREDENTIALS=true`).

## Endpoints

Prefixo global: `/api`. Referência completa em [docs/API.md](./docs/API.md).

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| `POST` | `/api/auth/register` | Cadastro de usuário | Pública |
| `POST` | `/api/auth/login` | Login (define cookies) | Pública |
| `POST` | `/api/auth/refresh` | Renova tokens | Refresh token |
| `POST` | `/api/auth/logout` | Logout (revoga refresh + limpa cookies) | Pública |
| `GET` | `/api/user` | Lista usuários | JWT |
| `GET` | `/api/user/me` | Perfil do usuário logado | JWT |
| `GET` | `/api/rooms` | Lista salas (filtros + paginação) | JWT |
| `GET` | `/api/rooms/:id` | Detalhe de sala | JWT |
| `POST` | `/api/rooms` | Cria sala | ADMIN / SUPERADMIN |
| `PATCH` | `/api/rooms/:id` | Atualiza sala | ADMIN / SUPERADMIN |
| `DELETE` | `/api/rooms/:id` | Exclui sala | ADMIN / SUPERADMIN |
| `POST` | `/api/reservations` | Cria reserva | JWT |
| `GET` | `/api/reservations` | Reservas do usuário | JWT |
| `GET` | `/api/reservations/schedule/weekly` | Agenda semanal | JWT |
| `GET` | `/api/reservations/history` | Histórico do usuário | JWT |
| `GET` | `/api/reservations/export/csv` | Exportação CSV | JWT |
| `GET` | `/api/reservations/stats` | Estatísticas | ADMIN / SUPERADMIN |
| `GET` | `/api/reservations/admin` | Todas as reservas | ADMIN / SUPERADMIN |
| `GET` | `/api/reservations/:id` | Detalhe de reserva (dono/admin) | JWT |
| `PATCH` | `/api/reservations/:id/cancel` | Cancela reserva (dono/admin) | JWT |
| `GET` | `/api/favorites` | Salas favoritas | JWT |
| `POST` | `/api/favorites/:roomId` | Toggle favorito | JWT |

## Como executar (Docker)

Pré-requisito: Docker + Docker Compose.

```bash
cd backend

# 1. Configuração — os valores padrão de .env.example funcionam com docker compose
cp .env.example .env

# 2. Sobe a API + PostgreSQL
#    O container executa automaticamente: npm install, prisma generate, prisma migrate deploy
docker compose up -d

# 3. Seed — cria 4 salas e os usuários de teste (obrigatório)
docker compose exec app npm run seed

# 4. Acessos
#    API:      http://localhost:3000/api
#    Swagger:  http://localhost:3000/api/docs
#    pgAdmin:  docker compose --profile tools up -d pgadmin  →  http://localhost:5050
```

Para parar: `docker compose down`. Para recriar do zero: `docker compose down -v && docker compose up -d`.

## Variáveis de ambiente

Arquivo: `backend/.env` (modelo em `backend/.env.example`).

| Variável | Padrão | Descrição |
|---|---|---|
| `NODE_ENV` | `development` | Ambiente; `production` ativa cookies `secure`/`sameSite=strict` |
| `PORT` | `3000` | Porta da API |
| `DATABASE_URL` | `postgresql://postgres:postgres@postgres:5432/seedabit_db?schema=public` | Conexão PostgreSQL |
| `JWT_ACCESS_SECRET` | — | Segredo do access token (obrigatório) |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | Expiração do access token |
| `JWT_REFRESH_SECRET` | — | Segredo do refresh token (obrigatório) |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Expiração do refresh token |
| `POSTGRES_USER` | `postgres` | Usuário do banco |
| `POSTGRES_PASSWORD` | `postgres` | Senha do banco |
| `POSTGRES_DB` | `seedabit_db` | Nome do banco |
| `API_PREFIX` | `api` | Prefixo global das rotas |
| `SWAGGER_PATH` | `api/docs` | Rota do Swagger |
| `CORS_ORIGIN` | `*` | Origens permitidas (separadas por vírgula) |
| `CORS_CREDENTIALS` | — | Habilita credenciais no CORS (necessário para cookies) |
| `LOG_LEVEL` | `debug` | Nível de log |

## Contas de teste (seed)

| Papel | Email | Senha |
|---|---|---|
| ADMIN | `admin@example.com` | `Admin123!` |
| USER | `user@example.com` | `User123!` |

Salas criadas: Sala Alpha (8), Sala Beta (12), Sala Gamma (4), Sala Delta (20) — capacidade entre parênteses.

## Testes

Dentro de `backend/`:

```bash
# Unitários (101 testes)
npm run test:unit

# E2E (70 testes) — requer Docker e dotenv-cli (npm i -g dotenv-cli)
npm run test:e2e

# Ambos
npm run test:all
```

| Suite | Quantidade |
|---|---|
| Unit: room.service | 19 |
| Unit: reservation.service | 32 |
| Unit: favorite.service | 6 |
| Unit: cookie.util | 6 |
| Unit: demais (auth, user, prisma, app) | 38 |
| E2E: rooms | 19 |
| E2E: reservations | 29 |
| E2E: auth | 21 |
| E2E: app | 1 |

## Documentação

- [docs/API.md](./docs/API.md) — referência completa dos endpoints (parâmetros, DTOs, respostas, erros)
- [docs/PR_BACKEND_API.md](./docs/PR_BACKEND_API.md) — proposta de PR do backend
- [docs/COMMITS.md](./docs/COMMITS.md) — mensagens de commit sugeridas

## Status do projeto

- ✅ Backend: API completa (auth, salas, reservas, favoritos, stats, CSV) com testes unitários e e2e
- 🚧 Frontend: scaffold Next.js criado; integração com a API em andamento
