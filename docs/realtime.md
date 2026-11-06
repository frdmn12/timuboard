# Realtime protocol

Timuboard uses [Socket.IO](https://socket.io) (path `/socket.io`) for two things: live boards for signed-in members, and the public guest playground. REST endpoints are documented in Swagger at `/docs`.

## Live boards

Changes are always written through REST. The server then broadcasts the result to every member currently viewing the board. Multiple API instances relay broadcasts through Redis (`@socket.io/redis-adapter` for rooms and presence, `@socket.io/redis-emitter` for broadcasts from services).

### Connecting

```js
io(API_URL, { auth: { token: accessToken } })
```

Connections without a valid token are rejected with `connect_error` and the message `UNAUTHORIZED`. When the access token expires, the server sends `auth:expired` and disconnects; the client refreshes the token (`POST /auth/refresh`) and reconnects.

### Client → server

| Event | Payload | Ack |
|---|---|---|
| `board:join` | `{ boardId }` | `{ ok: true, presence: [{ id, name }] }` or `{ ok: false, code: 'BOARD_NOT_FOUND' \| 'TOO_MANY_BOARDS' }`. Non-members get `BOARD_NOT_FOUND`. |
| `board:leave` | `{ boardId }` | `{ ok }` |
| `cursor:move` | `{ boardId, x, y }` | None. `x` is a fraction of the board width (including scrolled content), `y` is pixels from the top. Forwarded only after `board:join`. Invalid or out-of-range payloads (x -0.5..1.5, y -2000..200000) are dropped. Limited to 30 messages/second on average (burst 10). |
| `cursor:hide` | `{ boardId }` | None |

### Server → client

Board payloads always include `boardId`, `actorId`, and `at`.

| Event | Extra fields | Notes |
|---|---|---|
| `task:created` / `task:updated` | `task` | No `pinned` (pins are private). Includes `commentCount`. |
| `task:moved` | `task`, `columns` | `columns` is `{ [status]: taskId[] }`, the new order of the source and target columns. |
| `task:deleted` | `taskId` | |
| `comment:created` / `comment:updated` | `taskId`, `comment`, `commentCount` | No `canEdit`/`canDelete`; clients derive them from the author and their role. |
| `comment:deleted` | `taskId`, `commentId`, `commentCount` | |
| `member:added` / `member:updated` | `member` | |
| `member:removed` | `userId` | Also sent to the removed member, whose socket then leaves the room. |
| `board:updated` | `board` (`id`, `name`, `description`, `updatedAt`) | |
| `board:deleted` | | The room is closed. |
| `cursor:move` | `boardId`, `socketId`, `userId`, `name`, `x`, `y` | Other members' cursors. Not stored, sent as `volatile`, and never echoed to the sender. |
| `cursor:hide` | `boardId`, `socketId` | The cursor was hidden, left the board, or disconnected. |
| `presence:update` | `boardId`, `users: [{ id, name }]` | Unique users (several tabs count as one). |
| `notification:new` | `type` | Sent to the user's private room, no open board needed. Clients reload `unread-count`. |

**Avoiding echoes.** Send the `X-Socket-Id: <socket.id>` header on REST requests. That socket is excluded from broadcasts of its own changes; the user's other tabs still receive them.

**Security.** Membership is checked on `board:join`, and removed members are kicked from the room immediately. Sockets cannot change data; they only join and leave.

## Guest playground

The public `/playground` page lets visitors try a shared demo board, send reactions, and see who is online, without an account. Code: `backend-timuboard/src/playground/` and `frontend-timuboard/src/pages/Playground.tsx`.

### Scaling design

Visitors are split into **rooms** of at most 50 people (the lowest-numbered room that is not full). The server only knows room numbers; the frontend shows them as island names (`roomName` in `data/playground.ts`: 1 = Bali, 2 = Lombok, …, 17 = Bali 2). Member lists, cursors, reactions, and the demo board are broadcast only within a room, so the cost per room stays flat however many visitors there are. Only the online count is global:

- Each instance records people per room in Redis (`pg:rooms:{instanceId}`, 15-second TTL, refreshed every 2 seconds), so dead instances drop out of the count on their own.
- Every 2 seconds each instance sums all rooms and sends `online` to its own sockets, only when the number changed.
- Joins and leaves are sent as deltas (`presence:join` / `presence:leave`), not full lists. Snapshots are one room in size.
- Each room's demo board lives in Redis (`pg:board:{room}`, 1-hour TTL) and resets when the first person enters an empty room.

Known limits: room counts can be up to 2 seconds stale, so during a spike a room can slightly exceed 50 (a soft cap). The per-IP connection limit is counted per instance.

### Connecting

```js
io(API_URL + '/playground', { auth: { name, tz } })
```

No token. `name` is optional (control characters stripped, at most 24 characters, empty becomes `Tamu 123`). `tz` is optional, see Location below. At most 5 connections per IP (the last `X-Forwarded-For` entry from Caddy); extra connections get `connect_error` with `TOO_MANY_CONNECTIONS`.

### Client → server

Messages over the rate limit are silently dropped.

| Event | Payload | Ack / limit |
|---|---|---|
| `rename` | `{ name }` | `{ ok: true, name }` or `{ ok: false }`; 1/second (burst 3) |
| `location` | `{ tz: 'Asia/Makassar' \| null }` | `{ ok: true, tz }` or `{ ok: false }` (not a known IANA zone); 1/second (burst 3) |
| `task:move` | `{ taskId: 't1'..'t6', status: 'doing' \| 'review' \| 'done' }` | `{ ok }`; 4/second (burst 6) |
| `react` | `{ kind: 'like' \| 'love' \| 'fire' \| 'party' }` | None; 3/second (burst 5) |
| `cursor:move` | `{ x, y }` | None. Same coordinate rules as boards (x -0.5..1.5, y -2000..20000); 20/second (burst 10) |
| `cursor:hide` | | None |

### Server → client

| Event | Fields | Notes |
|---|---|---|
| `welcome` | `self`, `room`, `members: [{ id, name, tz }]`, `board: { [taskId]: status }`, `total` | Sent once after connecting, and again on every reconnect with a new id. |
| `presence:join` / `presence:leave` / `presence:update` | `{ id, name, tz }` | `presence:update` means the name or location changed. Same room only, not to the sender. |
| `online` | `{ total }` | Online count across all rooms and instances. |
| `task:moved` | `taskId`, `status`, `by` | Not sent to the sender (the client already updated). |
| `react` | `id`, `name`, `kind` | `volatile` |
| `cursor:move` / `cursor:hide` | `id`, `name`, `x`, `y` / `id` | `cursor:move` is `volatile`; cursors also disappear on `presence:leave`. |

### Location (opt-in)

Off by default. Guests turn it on with the "Show my location" toggle (remembered in `localStorage`). The client sends the device time zone (`Intl.DateTimeFormat().resolvedOptions().timeZone`), not GPS or IP, so it is approximate and can be faked. The server accepts only valid IANA zone names (free text is rejected), never stores them in Redis or logs, and forwards them only to the same room. They appear only in the online list, not in cursor payloads: `Indonesia · WIB/WITA/WIT` for Indonesian zones, otherwise the zone's city (`Asia/Tokyo` = Tokyo).

The demo card titles live in `frontend-timuboard/src/data/playground.ts`; their ids and initial statuses must match `DEMO_TASKS` in the gateway. Tests: `npx jest --config test/jest-e2e.json test/playground.e2e-spec.ts`.
