## How To run Program

Run all

```
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

Run only postgre & redis

```
docker compose up postgre & redis
```

then running the project

```
cd backend-timuboard
npm run start:dev
```

```
cd frontend-timuboard
npm run dev
```


## Melihat database (Adminer)

Buka http://localhost:8080 dan isi: System `PostgreSQL`, Server `postgres`, Username `bayu`, Password `secret123`, Database `collabboard` (nilai dari `.env`).

## Backend: Authentication

Setup sekali: `cp .env.example .env`, lalu isi `JWT_ACCESS_SECRET` (`openssl rand -hex 32`).

Semua lewat Docker (backend + Postgres + Redis + Mailpit + Adminer):

```
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build server postgres redis mailpit adminer
curl localhost:3000/health            # {"status":"ok","db":"up","redis":"up"}
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f server
```

Atau hanya infrastruktur di Docker, backend di host:

```
docker compose up -d postgres redis mailpit adminer   # Postgres :5433, Redis :6379, Mailpit SMTP :1025 / inbox http://localhost:8025, Adminer http://localhost:8080
cd backend-timuboard && npm run start:dev
npm test                                # unit
npm run test:e2e                        # e2e nyata (butuh postgres + mailpit)
```

| Endpoint | Keterangan |
|---|---|
| `POST /auth/register` | `{ name, email, password }`. 201, kirim email verifikasi. 409 bila email sudah ada |
| `POST /auth/verify-email` | `{ token }` dari tautan email (`{FRONTEND_URL}/verifikasi?token=...`). Berlaku 24 jam, idempoten |
| `POST /auth/resend-verification` | `{ email }`. Jawaban selalu sama (tidak membocorkan email terdaftar) |
| `POST /auth/login` | `{ email, password }`. Access token (JWT 15 menit) di body, refresh token (7 hari) di cookie httpOnly. 403 `EMAIL_NOT_VERIFIED` bila belum verifikasi |
| `POST /auth/refresh` | Rotasi refresh token; pemakaian ulang token lama mencabut semua sesi |
| `POST /auth/forgot-password` | `{ email }`. Jawaban selalu sama; email berisi tautan `{FRONTEND_URL}/atur-ulang-kata-sandi?token=...` (60 menit, sekali pakai). 3 permintaan/menit |
| `POST /auth/reset-password` | `{ token, password }`. Mengganti kata sandi dan mencabut semua sesi aktif; 400 bila token tidak valid/sudah dipakai |
| `POST /auth/logout` | Mencabut sesi dan menghapus cookie |
| `GET /users/me` | Butuh `Authorization: Bearer <accessToken>` |

Endpoint `/auth/*` dibatasi 10 permintaan/menit per IP; hitungannya disimpan di Redis, jadi konsisten di banyak instance. `GET /health` memeriksa Postgres dan Redis. Semua route butuh JWT kecuali ditandai `@Public()`.


## Backend: Board & Task

Semua route butuh `Authorization: Bearer <accessToken>`. Bukan anggota papan = 404; anggota dengan peran kurang = 403.

| Endpoint | Peran | Keterangan |
|---|---|---|
| `POST /boards` `{ name, description? }` | login | Pembuat otomatis admin + pemilik |
| `GET /boards` | login | Papan milik saya + statistik (`memberCount`, `taskCount`, `doneCount`, `progress`) |
| `GET/PATCH/DELETE /boards/:boardId` | anggota / admin / pemilik | Hapus papan = pemilik saja, tugas ikut terhapus |
| `GET /boards/:boardId/members` | anggota | |
| `POST /boards/:boardId/members` `{ email, role? }` | admin | Pengguna harus sudah punya akun (404 `USER_NOT_FOUND`), 409 bila sudah anggota |
| `PATCH /boards/:boardId/members/:userId` `{ role }` | admin | Peran pemilik terkunci |
| `DELETE /boards/:boardId/members/:userId` | admin, atau diri sendiri | Pemilik tidak bisa keluar |
| `GET /boards/:boardId/tasks?status&assigneeId&q&pinned` | anggota | Diurutkan per kolom lalu `order` |
| `POST /boards/:boardId/tasks` | anggota | `title`, `description`, `status`, `tags`, `priority`, `dueDate`, `assigneeId`, `progress` |
| `PATCH /boards/:boardId/tasks/:taskId` | anggota | Tidak mengubah status; `null` mengosongkan penanggung jawab/tenggat |
| `POST /boards/:boardId/tasks/:taskId/move` `{ status, position }` | anggota | Drag & drop: kolom dan urutan dirapikan atomik (papan dikunci) |
| `DELETE /boards/:boardId/tasks/:taskId` | anggota | |
| `PUT/DELETE /boards/:boardId/tasks/:taskId/pin` | anggota | Sematan bersifat pribadi |
| `GET /tasks/pinned` | login | Tugas tersemat saya, lintas papan |
| `GET /boards/:boardId/tasks/:taskId/comments?limit&before` | anggota | Komentar lama ke baru; `limit` 1-100 (bawaan 50). Respons `{ items, nextBefore }`: kirim `nextBefore` sebagai `before` untuk memuat yang lebih lama |
| `POST /boards/:boardId/tasks/:taskId/comments` `{ body }` | anggota | 1-2000 karakter, 20/menit |
| `PATCH .../comments/:commentId` `{ body }` | penulis saja | Menandai `edited` bila isi berubah |
| `DELETE .../comments/:commentId` | penulis atau admin | |

Status tugas: `todo`, `doing`, `review`, `done`. Setiap tugas membawa `commentCount`. Item komentar memuat `canEdit` dan `canDelete` untuk pengguna yang meminta.

Tes e2e: suite board dan komentar mematikan rate limit (`THROTTLE_DISABLED`, ditolak di production). Suite auth menguji rate limit sungguhan, jadi beri jeda satu menit bila dijalankan dua kali berturut-turut.

## Backend: Notifikasi

Notifikasi dalam aplikasi (belum ada pengiriman email atau push). Semua route butuh login dan hanya menyentuh notifikasi milik sendiri.

| Endpoint | Keterangan |
|---|---|
| `GET /notifications?limit&before&unread` | Terbaru dulu. Respons `{ items, nextBefore, unreadCount }`; `limit` 1-100 (bawaan 20); `unread=true` hanya yang belum dibaca |
| `GET /notifications/unread-count` | `{ count }`, ringan untuk polling lencana lonceng |
| `POST /notifications/:id/read` | 204, idempoten; milik orang lain 404 |
| `POST /notifications/read-all` | `{ updated }` |
| `GET/PATCH /notifications/preferences` | `{ assigned, comment, review, boardAdded }`, bawaan semua aktif |

Jenis (`type`) dan pemicunya (pelaku sendiri tidak pernah dikabari):

| `type` | Pemicu | Penerima |
|---|---|---|
| `task_assigned` | Tugas dibuat atau diubah dengan penanggung jawab baru | Penanggung jawab |
| `comment_added` | Komentar baru | Penanggung jawab + peserta diskusi sebelumnya (`data.preview` maks 120 karakter) |
| `review_requested` | Tugas pindah ke kolom Review | Admin papan |
| `board_added` | Ditambahkan ke papan | Yang ditambahkan |

Setiap notifikasi membawa `actor`, `boardId`, `taskId`, dan `data` (`taskTitle`, `boardName`) yang dibekukan saat dibuat. Notifikasi ikut terhapus bersama tugas atau papannya. Kegagalan membuat notifikasi hanya dicatat dan tidak menggagalkan aksi utamanya.


## Dokumentasi API (Swagger)

Seluruh endpoint backend terdokumentasi dengan OpenAPI (`@nestjs/swagger`), termasuk bentuk envelope sukses/galat, kode galat domain, rate limit, dan aturan 404 vs 403 untuk papan.

- UI interaktif: `http://localhost:3000/docs`
- Spesifikasi JSON: `http://localhost:3000/docs-json`
- Aktif secara bawaan selain di production. Di production hanya menyala bila `SWAGGER_ENABLED=true` di `.env`.
- **Authorize**: login dulu (`POST /auth/login` dari UI, atau `curl -X POST localhost:3000/auth/login -H 'Content-Type: application/json' -d '{"email":"...","password":"..."}'`), salin `data.accessToken`, klik tombol **Authorize** di kanan atas UI, tempel token tanpa kata `Bearer`. Token tersimpan di browser (berlaku 15 menit; ulangi login bila kedaluwarsa). Route publik (Auth, Health) tidak bergembok.
- Cookie refresh token (`refresh_token`) dipasang browser saat login lewat `Set-Cookie`; "Try it out" untuk `/auth/refresh` memakainya otomatis hanya bila UI dan API satu origin.
- Ekspor spesifikasi (mis. untuk generator klien atau Postman): `curl -o openapi.json http://localhost:3000/docs-json`.
- Properti DTO diturunkan otomatis oleh plugin Swagger di `nest-cli.json` saat `nest build`/`nest start`; tes e2e (ts-jest) tidak memakainya dan tidak terpengaruh.

## Backend: Papan realtime

Perubahan tetap ditulis lewat REST; server menyiarkan hasilnya lewat **Socket.IO** (path `/socket.io`) ke semua anggota yang sedang membuka papan. Banyak instance backend saling meneruskan siaran lewat Redis (`@socket.io/redis-adapter` untuk room/presence, `@socket.io/redis-emitter` untuk siaran dari service).

**Menyambung:** `io(API_URL, { auth: { token: <accessToken> } })`. Tanpa token valid koneksi ditolak (`connect_error` dengan pesan `UNAUTHORIZED`). Saat access token kedaluwarsa server mengirim `auth:expired` lalu memutus; klien memperbarui token (`POST /auth/refresh`) dan menyambung ulang.

**Dari klien** (dengan ack):

| Event | Payload | Ack |
|---|---|---|
| `board:join` | `{ boardId }` | `{ ok: true, presence: [{id, name}] }` atau `{ ok: false, code: 'BOARD_NOT_FOUND' \| 'TOO_MANY_BOARDS' }` (bukan anggota = `BOARD_NOT_FOUND`) |
| `board:leave` | `{ boardId }` | `{ ok }` |
| `cursor:move` | `{ boardId, x, y }` | tanpa ack. `x` = pecahan lebar area papan (termasuk bagian yang tergulir), `y` = piksel dari tepi atas area. Hanya diteruskan bila socket sudah `board:join`; payload tidak valid atau di luar rentang (x -0.5..1.5, y -2000..200000) dibuang; dibatasi rata-rata 30 pesan/detik (burst 10), kelebihannya dibuang |
| `cursor:hide` | `{ boardId }` | tanpa ack |

**Dari server** (payload papan selalu memuat `boardId`, `actorId`, `at`):

| Event | Isi tambahan | Catatan |
|---|---|---|
| `task:created` / `task:updated` | `task` | Tanpa `pinned` (sematan bersifat pribadi); memuat `commentCount` |
| `task:moved` | `task`, `columns` | `columns` = `{ [status]: taskId[] }` urutan baru kolom asal dan tujuan |
| `task:deleted` | `taskId` | |
| `comment:created` / `comment:updated` | `taskId`, `comment`, `commentCount` | Tanpa `canEdit`/`canDelete`; klien menghitung dari penulis dan peran |
| `comment:deleted` | `taskId`, `commentId`, `commentCount` | |
| `member:added` / `member:updated` | `member` | |
| `member:removed` | `userId` | Diterima juga oleh yang dikeluarkan; setelah itu socket-nya dikeluarkan dari room |
| `board:updated` | `board` (`id`, `name`, `description`, `updatedAt`) | |
| `board:deleted` | | Room dibubarkan |
| `cursor:move` | `boardId`, `socketId`, `userId`, `name`, `x`, `y` | Posisi kursor anggota lain; tidak disimpan dan dikirim `volatile` (boleh hilang). Tidak dikirim ke pengirimnya |
| `cursor:hide` | `boardId`, `socketId` | Kursor itu disembunyikan: pengirim menyembunyikan, meninggalkan papan, atau terputus |
| `presence:update` | `boardId`, `users: [{id, name}]` | Pengguna unik (banyak tab dihitung satu) |
| `notification:new` | `type` | Ke room pribadi pengguna, tanpa perlu membuka papan; klien memuat ulang `unread-count` |

**Menghindari pantulan:** kirim header `X-Socket-Id: <socket.id>` pada permintaan REST; socket itu dikecualikan dari siaran perubahan yang ia buat sendiri (tab lain milik pengguna yang sama tetap menerima).

**Keamanan:** keanggotaan diperiksa saat `board:join`; anggota yang dikeluarkan langsung dikeluarkan dari room. Perubahan lewat socket tidak ada (hanya join/leave).


## Playground (tamu tanpa login)

Laman publik `/playground` (tombol "Coba di Playground" di landing): pengunjung mencoba papan demo bersama, mengirim reaksi, dan melihat siapa saja yang sedang online, tanpa akun. Kode: `backend-timuboard/src/playground/`, `frontend-timuboard/src/pages/Playground.tsx`.

**Desain beban:** pengunjung dibagi ke **ruang** berisi maksimal 50 orang (ruang bernomor terkecil yang belum penuh). Server hanya mengenal nomor; frontend menampilkannya sebagai nama pulau (`roomName` di `data/playground.ts`: 1 = Bali, 2 = Lombok, …, ke-17 = Bali 2). Daftar orang, kursor, reaksi, dan papan demo hanya disiarkan di dalam ruang, jadi biayanya tetap per ruang berapa pun jumlah pengunjung. Yang global hanya jumlah online:

- Tiap instance mencatat jumlah orang per ruang di Redis (`pg:rooms:{instanceId}`, TTL 15 detik, diperpanjang tiap 2 detik); instance yang mati hilang sendiri dari hitungan.
- Tiap 2 detik setiap instance menjumlahkan semua ruang dan mengirim `online` ke socket miliknya sendiri, hanya bila angkanya berubah.
- Masuk/keluar dikirim sebagai perubahan (`presence:join` / `presence:leave`), bukan daftar penuh. Snapshot daftar hanya sebesar satu ruang.
- Isi papan demo per ruang disimpan di Redis (`pg:board:{ruang}`, TTL 1 jam) dan direset saat orang pertama masuk ke ruang kosong.

Batas yang diketahui: hitungan ruang bisa basi sampai 2 detik, jadi saat lonjakan sebuah ruang bisa sedikit melewati 50 (batas lunak). Batas koneksi per IP dihitung per instance.

**Menyambung:** `io(API_URL + '/playground', { auth: { name, tz } })`. Tanpa token; `name` opsional (dibersihkan dari karakter kontrol, maksimal 24 karakter, kosong = `Tamu 123`); `tz` opsional, lihat Lokasi di bawah. Maksimal 5 koneksi per IP (IP = entri terakhir `X-Forwarded-For` dari Caddy); kelebihannya ditolak dengan `connect_error` pesan `TOO_MANY_CONNECTIONS`.

**Dari klien** (kelebihan laju dibuang diam-diam):

| Event | Payload | Ack / batas |
|---|---|---|
| `rename` | `{ name }` | `{ ok: true, name }` atau `{ ok: false }`; 1/detik (burst 3) |
| `location` | `{ tz: 'Asia/Makassar' \| null }` | `{ ok: true, tz }` atau `{ ok: false }` (bukan zona IANA yang dikenali); 1/detik (burst 3) |
| `task:move` | `{ taskId: 't1'..'t6', status: 'doing' \| 'review' \| 'done' }` | `{ ok }`; 4/detik (burst 6) |
| `react` | `{ kind: 'like' \| 'love' \| 'fire' \| 'party' }` | tanpa ack; 3/detik (burst 5) |
| `cursor:move` | `{ x, y }` | tanpa ack; aturan koordinat sama dengan papan (x -0.5..1.5, y -2000..20000); 20/detik (burst 10) |
| `cursor:hide` | | tanpa ack |

**Dari server:**

| Event | Isi | Catatan |
|---|---|---|
| `welcome` | `self`, `room`, `members: [{id, name, tz}]`, `board: { [taskId]: status }`, `total` | Dikirim sekali setelah tersambung (dan lagi setiap sambung ulang, dengan id baru) |
| `presence:join` / `presence:leave` / `presence:update` | `{ id, name, tz }` | `presence:update` = nama atau lokasi berubah. Hanya ke ruang yang sama, tidak ke pengirimnya |
| `online` | `{ total }` | Jumlah online di semua ruang dan instance |
| `task:moved` | `taskId`, `status`, `by` | Tidak ke pengirimnya (klien sudah memperbarui sendiri) |
| `react` | `id`, `name`, `kind` | `volatile` |
| `cursor:move` / `cursor:hide` | `id`, `name`, `x`, `y` / `id` | `cursor:move` dikirim `volatile`; kursor juga hilang saat `presence:leave` |

**Lokasi (opt-in):** mati secara bawaan; tamu menyalakannya lewat toggle "Tampilkan lokasiku" (pilihan diingat di `localStorage`). Klien mengirim zona waktu perangkat (`Intl.DateTimeFormat().resolvedOptions().timeZone`), bukan GPS atau IP, jadi hanya perkiraan dan bisa dipalsukan. Server hanya menerima nama zona IANA yang valid (teks bebas ditolak), tidak menyimpannya di Redis atau log, dan hanya meneruskannya ke ruang yang sama. Tampil hanya di daftar online (tidak ikut payload kursor): `Indonesia · WIB/WITA/WIT` untuk zona Indonesia, selain itu nama kota zona (`Asia/Tokyo` = Tokyo).

Judul kartu demo ada di `frontend-timuboard/src/data/playground.ts`; id dan status awalnya harus sama dengan `DEMO_TASKS` di gateway. Tes: `npx jest --config test/jest-e2e.json test/playground.e2e-spec.ts`.
