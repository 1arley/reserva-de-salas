# Referência da API — Reserva de Salas

Prefixo global: `/api` (configurável via `API_PREFIX`). Swagger interativo em `http://localhost:3000/api/docs`.

## Autenticação

Duas formas de enviar o JWT:

1. **Cookies `httpOnly`** (recomendado para browser) — `access_token` e `refresh_token` definidos em `POST /api/auth/login` e `POST /api/auth/refresh`; enviados automaticamente pelo navegador.
2. **Header** — `Authorization: Bearer <token>` (compatível com clientes não-browser).

Papéis: `USER`, `ADMIN`, `SUPERADMIN`. Rotas com `ADMIN / SUPERADMIN` exigem um desses dois papéis; as demais autenticadas aceitam qualquer papel.

## Formato de erro

Todas as respostas de erro seguem o formato padrão (filtro global `HttpExceptionFilter`):

```json
{
  "statusCode": 409,
  "timestamp": "2026-08-06T14:00:00.000Z",
  "path": "/api/reservations",
  "message": "A sala já está reservada neste horário."
}
```

`message` pode ser `string` ou `string[]` (erros de validação). Erros Prisma mapeados: `P2002` → `409`, `P2025` → `404`.

### Códigos de status

| Código | Significado |
|---|---|
| `200` / `201` / `204` | Sucesso (204: sem corpo — logout) |
| `400` | Validação de DTO ou regra de negócio (horário passado, duração > 24h, `endTime` ≤ `startTime`) |
| `401` | Não autenticado, token inválido/expirado, credenciais inválidas |
| `403` | Autenticado sem permissão (não é dono nem admin) |
| `404` | Recurso não encontrado (inclui `P2025`) |
| `409` | Conflito: duplicado (`P2002`), reserva sobreposta, sala indisponível, reserva já cancelada, sala com reservas futuras |
| `500` | Erro interno |

---

## Auth

### `POST /api/auth/register`

Cadastro de usuário. **Auth:** pública.

**Body (`RegisterDto`):**

| Campo | Tipo | Obrigatório | Validação | Exemplo |
|---|---|---|---|---|
| `name` | string | sim | não vazio | `"John Doe"` |
| `email` | string | sim | email válido | `"john@example.com"` |
| `password` | string | sim | mínimo 8 caracteres | `"password123"` |

**Resposta `201`:**

```json
{
  "message": "Usuário cadastrado com sucesso.",
  "user": { "id": "uuid", "email": "john@example.com", "name": "John Doe", "role": "USER", "createdAt": "...", "updatedAt": "..." }
}
```

**Erros:** `400` (validação), `409` (email já cadastrado).

### `POST /api/auth/login`

Login. **Auth:** pública. Define cookies `access_token`/`refresh_token` na resposta.

**Body (`LoginDto`):**

| Campo | Tipo | Obrigatório | Validação | Exemplo |
|---|---|---|---|---|
| `email` | string | sim | email válido | `"john@example.com"` |
| `password` | string | sim | mínimo 8 caracteres | `"Senha@123"` |

**Resposta `201`** (além dos cookies `Set-Cookie`):

```json
{
  "access_token": "<jwt>",
  "refresh_token": "<jwt>",
  "user": { "id": "uuid", "email": "john@example.com", "name": "John Doe", "role": "USER", "createdAt": "...", "updatedAt": "..." }
}
```

**Erros:** `400` (validação), `401` (credenciais inválidas).

### `POST /api/auth/refresh`

Renova os tokens. **Auth:** refresh token válido (cookie `refresh_token` ou Bearer). Revoga o refresh antigo e define novos cookies.

**Resposta `201`:**

```json
{ "access_token": "<jwt>", "refresh_token": "<jwt>" }
```

**Erros:** `401` (refresh ausente, expirado, revogado ou não corresponde ao usuário).

### `POST /api/auth/logout`

Encerra a sessão. **Auth:** pública — lê o refresh token do cookie `refresh_token` ou do header `Authorization: Bearer`, revoga-o no banco (hash SHA-256) e limpa os cookies. Funciona mesmo com access token expirado.

**Resposta `204 No Content`** (sem corpo).

---

## User

### `GET /api/user`

Lista usuários. **Auth:** JWT.

**Query params:**

| Parâmetro | Tipo | Padrão | Descrição |
|---|---|---|---|
| `page` | number (≥1) | `1` | Página |
| `limit` | number (≥1) | `10` | Itens por página |

**Resposta `200`:**

```json
{
  "data": [
    { "id": "uuid", "email": "john@example.com", "name": "John Doe", "role": "USER", "createdAt": "...", "updatedAt": "..." }
  ],
  "meta": { "total": 2, "page": 1, "limit": 10, "totalPages": 1 }
}
```

### `GET /api/user/me`

Perfil do usuário autenticado. **Auth:** JWT.

**Resposta `200`:**

```json
{ "id": "uuid", "email": "john@example.com", "name": "John Doe", "role": "USER", "createdAt": "...", "updatedAt": "..." }
```

---

## Rooms (salas)

### `GET /api/rooms`

Lista salas com filtros e paginação. **Auth:** JWT.

**Query params (`FilterRoomDto`):**

| Parâmetro | Tipo | Descrição | Exemplo |
|---|---|---|---|
| `search` | string | Busca por nome (case-insensitive) | `"alpha"` |
| `minCapacity` | number (≥1) | Capacidade mínima | `8` |
| `status` | enum `AVAILABLE` / `MAINTENANCE` / `INACTIVE` | Filtro por status | `AVAILABLE` |
| `availableFrom` | string (ISO 8601) | Início do intervalo de disponibilidade — retorna apenas salas **sem** reserva confirmada sobreposta ao intervalo | `2026-08-10T14:00:00.000Z` |
| `availableTo` | string (ISO 8601) | Fim do intervalo (usado junto com `availableFrom`) | `2026-08-10T15:00:00.000Z` |
| `page` | number (≥1) | Página | `1` |
| `limit` | number (≥1) | Itens por página | `10` |

**Resposta `200`** (ordenada por nome asc):

```json
{
  "data": [
    { "id": "uuid", "name": "Sala Alpha", "description": "Sala para reuniões de até 8 pessoas com projetor.", "capacity": 8, "resources": ["projetor", "tv"], "status": "AVAILABLE", "createdAt": "...", "updatedAt": "..." }
  ],
  "total": 4,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

### `GET /api/rooms/:id`

Detalhe de sala. **Auth:** JWT.

**Resposta `200`:** objeto `Room` (mesma forma acima).

**Erros:** `404` (sala não encontrada).

### `POST /api/rooms`

Cria sala. **Auth:** `ADMIN` / `SUPERADMIN`.

**Body (`CreateRoomDto`):**

| Campo | Tipo | Obrigatório | Validação | Exemplo |
|---|---|---|---|---|
| `name` | string | sim | mínimo 2 caracteres, **único** | `"Sala de Reunião A"` |
| `capacity` | number | sim | inteiro ≥ 1 | `10` |
| `description` | string | não | — | `"Sala com projetor e lousa"` |
| `resources` | string[] | não | — | `["projetor", "whiteboard"]` |
| `status` | enum `RoomStatus` | não | — | `AVAILABLE` (padrão) |

**Resposta `201`:** objeto `Room` criado.

**Erros:** `400`, `401`, `403`, `409` (nome duplicado — `P2002`).

### `PATCH /api/rooms/:id`

Atualiza sala (parcial). **Auth:** `ADMIN` / `SUPERADMIN`.

**Body (`UpdateRoomDto`):** qualquer campo de `CreateRoomDto`, todos opcionais.

**Regra de negócio:** mudança de `status` para valor diferente de `AVAILABLE` é rejeitada (`409`) se existirem reservas confirmadas futuras.

**Resposta `200`:** objeto `Room` atualizado.

**Erros:** `400`, `401`, `403`, `404`, `409` (nome duplicado ou status bloqueado por reservas futuras).

### `DELETE /api/rooms/:id`

Exclui sala. **Auth:** `ADMIN` / `SUPERADMIN`.

**Regra de negócio:** exclusão rejeitada (`409`) se existirem reservas confirmadas futuras.

**Resposta `200`:**

```json
{ "message": "Sala excluída com sucesso." }
```

**Erros:** `401`, `403`, `404`, `409`.

---

## Reservations (reservas)

> Todos os endpoints de reserva incluem na resposta `room: { id, name, capacity }` e `user: { id, name, email }`.

### `POST /api/reservations`

Cria reserva. **Auth:** JWT (reserva criada em nome do usuário autenticado).

**Body (`CreateReservationDto`):**

| Campo | Tipo | Obrigatório | Validação | Exemplo |
|---|---|---|---|---|
| `roomId` | string (UUID) | sim | UUID válido | `"room-uuid"` |
| `startTime` | string (ISO 8601) | sim | data válida | `"2026-08-10T14:00:00.000Z"` |
| `endTime` | string (ISO 8601) | sim | data válida | `"2026-08-10T15:00:00.000Z"` |
| `notes` | string | não | mínimo 2 caracteres | `"Reunião de planejamento"` |

**Regras de negócio:**

- `endTime` deve ser posterior a `startTime` (`400`).
- `startTime` não pode estar no passado (`400`).
- Duração máxima de **24 horas** (`400`).
- Sala deve existir (`404`) e estar com status `AVAILABLE` (`409`).
- Conflito com reserva `CONFIRMED` sobreposta no mesmo `roomId` → `409`. A verificação acontece **dentro de transação `Serializable`**, eliminando corrida de double-booking.

**Resposta `201`:**

```json
{
  "id": "uuid",
  "userId": "uuid",
  "roomId": "uuid",
  "startTime": "2026-08-10T14:00:00.000Z",
  "endTime": "2026-08-10T15:00:00.000Z",
  "status": "CONFIRMED",
  "notes": "Reunião de planejamento",
  "createdAt": "...",
  "updatedAt": "...",
  "room": { "id": "uuid", "name": "Sala Alpha", "capacity": 8 },
  "user": { "id": "uuid", "name": "John Doe", "email": "john@example.com" }
}
```

**Erros:** `400`, `401`, `404`, `409`.

### `GET /api/reservations`

Reservas do usuário autenticado. **Auth:** JWT.

**Query params (`FilterReservationDto`):**

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `status` | enum `CONFIRMED` / `CANCELLED` | Filtro por status |
| `from` | string (ISO 8601) | `startTime >= from` |
| `to` | string (ISO 8601) | `startTime <= to` |
| `roomId` | string (UUID) | Filtro por sala |
| `page` | number (≥1, padrão `1`) | Página |
| `limit` | number (≥1, padrão `10`) | Itens por página |

**Resposta `200`** (ordenada por `startTime` desc):

```json
{ "data": [ /* Reservation[] com room e user */ ], "total": 1, "page": 1, "limit": 10, "totalPages": 1 }
```

### `GET /api/reservations/schedule/weekly`

Agenda semanal com reservas confirmadas de todas as salas. **Auth:** JWT.

**Query params:**

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `weekStart` | string (ISO 8601) | Data de início da semana. Se ausente, usa segunda-feira da semana atual |

**Resposta `200`** (reservas ordenadas por `startTime` asc):

```json
{
  "weekStart": "2026-08-10T00:00:00.000Z",
  "reservations": [ /* Reservation[] CONFIRMED com room e user */ ]
}
```

### `GET /api/reservations/history`

Histórico do usuário (reservas com `endTime` no passado). **Auth:** JWT.

**Query params:** mesmos de `GET /api/reservations` (`status`, `page`, `limit`).

**Resposta `200`:** `{ data, total, page, limit, totalPages }`.

### `GET /api/reservations/export/csv`

Exporta reservas em CSV. **Auth:** JWT — usuário regular exporta apenas as próprias; `ADMIN`/`SUPERADMIN` exportam todas.

**Headers da resposta:** `Content-Type: text/csv`, `Content-Disposition: attachment; filename="reservas.csv"`.

**Corpo:** CSV com cabeçalho `id,sala,usuario,email,inicio,fim,status` e uma linha por reserva (ordenada por `startTime` desc). Valores são sanitizados contra **CSV injection** (células iniciadas com `=`, `+`, `-`, `@`, `\t`, `\r` recebem aspas simples de escape).

### `GET /api/reservations/stats`

Estatísticas do dashboard. **Auth:** `ADMIN` / `SUPERADMIN`.

**Resposta `200`:**

```json
{
  "totalRooms": 4,
  "totalReservations": 10,
  "activeToday": 2,
  "cancellationRate": 10.5,
  "topRooms": [ { "roomId": "uuid", "name": "Sala Alpha", "count": 6 } ]
}
```

| Campo | Descrição |
|---|---|
| `totalRooms` | Total de salas cadastradas |
| `totalReservations` | Total de reservas |
| `activeToday` | Reservas confirmadas ativas no momento |
| `cancellationRate` | Percentual de cancelamento (2 casas decimais) |
| `topRooms` | Top 5 salas por número de reservas confirmadas |

### `GET /api/reservations/admin`

Lista todas as reservas (todas as salas e usuários). **Auth:** `ADMIN` / `SUPERADMIN`.

**Query params:** mesmos de `GET /api/reservations`.

**Resposta `200`:** `{ data, total, page, limit, totalPages }`.

### `GET /api/reservations/:id`

Detalhe de reserva. **Auth:** JWT — apenas o dono ou `ADMIN`/`SUPERADMIN`.

**Resposta `200`:** objeto `Reservation` com `room` e `user`.

**Erros:** `401`, `403` (não é o dono nem admin), `404`.

### `PATCH /api/reservations/:id/cancel`

Cancela reserva. **Auth:** JWT — apenas o dono ou `ADMIN`/`SUPERADMIN`.

**Regras de negócio:**

- Reserva já cancelada → `409` ("Esta reserva já foi cancelada.").
- Reserva já iniciada (`startTime` no passado) → `409`.

**Resposta `200`:** objeto `Reservation` com `status: "CANCELLED"`.

**Erros:** `401`, `403`, `404`, `409`.

---

## Favorites (favoritos)

### `GET /api/favorites`

Salas favoritas do usuário autenticado. **Auth:** JWT.

**Resposta `200`** (ordenação por `createdAt` desc):

```json
[
  { "id": "uuid", "name": "Sala Alpha", "description": "...", "capacity": 8, "resources": ["projetor", "tv"], "status": "AVAILABLE", "createdAt": "...", "updatedAt": "..." }
]
```

### `POST /api/favorites/:roomId`

Toggle de favorito — adiciona se não existe, remove se existe. **Auth:** JWT. Operação atômica (create + catch de `P2002`).

**Resposta `200`:**

| Resposta | Significado |
|---|---|
| `{ "favorited": true }` | Sala adicionada aos favoritos |
| `{ "favorited": false }` | Sala removida dos favoritos |

**Erros:** `401`, `404` (sala não encontrada).

---

## Exemplos de uso (curl)

### Login (guarda cookies) + criação de reserva

```bash
# Login — salva cookies em cookies.txt
curl -i -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"User123!"}' \
  -c cookies.txt

# Cria reserva (cookie httpOnly enviado automaticamente)
curl -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"roomId":"<room-uuid>","startTime":"2026-08-10T14:00:00.000Z","endTime":"2026-08-10T15:00:00.000Z","notes":"Reunião de planejamento"}'

# Alternativa sem cookie: Bearer token
curl -X POST http://localhost:3000/api/reservations \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"roomId":"<room-uuid>","startTime":"2026-08-10T14:00:00.000Z","endTime":"2026-08-10T15:00:00.000Z"}'
```

### Salas livres em um intervalo

```bash
curl "http://localhost:3000/api/rooms?availableFrom=2026-08-10T14:00:00.000Z&availableTo=2026-08-10T15:00:00.000Z&minCapacity=4" \
  -b cookies.txt
```
