import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { REFRESH_COOKIE } from './auth/auth.controller';

const DESCRIPTION = `API backend Timuboard: papan kolaborasi tugas (Kanban) dengan anggota, komentar, dan notifikasi.

**Envelope respons.** Semua respons dibungkus:
- Sukses: \`{ "success": true, "data": ..., "meta": { "timestamp": "..." } }\`. Endpoint 204 tidak punya isi.
- Galat: \`{ "success": false, "error": { "code", "message", "details" }, "meta": { "timestamp": "..." } }\`. \`details\` berisi daftar pesan pada galat validasi (400), selain itu null.

**Autentikasi.** Kecuali route di tag Auth (dan Health), kirim access token JWT lewat header \`Authorization: Bearer <token>\`. Token didapat dari \`POST /auth/login\`. Refresh token disimpan di cookie httpOnly \`${REFRESH_COOKIE}\` (path \`/auth\`) dan dipakai oleh \`POST /auth/refresh\` dan \`POST /auth/logout\`.

**Akses papan.** Untuk route \`/boards/{boardId}/...\`: bukan anggota papan (atau papan tidak ada) = **404** \`BOARD_NOT_FOUND\` supaya keberadaan papan tidak bocor; anggota dengan peran kurang (mis. member mengakses route khusus admin) = **403** \`INSUFFICIENT_BOARD_ROLE\`.

**Rate limit.** Global 100 permintaan/menit; \`/auth/*\` 10/menit; \`resend-verification\` dan \`forgot-password\` 3/menit; \`POST\` komentar 20/menit. Terlampaui = **429** \`TOO_MANY_REQUESTS\`.`;

/** Swagger aktif di luar production; di production hanya bila SWAGGER_ENABLED=true. */
export function swaggerEnabled(config: ConfigService): boolean {
  const explicit = config.get<boolean>('SWAGGER_ENABLED');
  return explicit ?? config.get<string>('NODE_ENV') !== 'production';
}

/** Dipanggil dari main.ts saja (bukan configureApp) agar tes e2e tidak terpengaruh. */
export function setupSwagger(app: INestApplication) {
  if (!swaggerEnabled(app.get(ConfigService))) return;
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Timuboard API')
      .setDescription(DESCRIPTION)
      .setVersion('1.0.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'bearer',
      )
      .addCookieAuth(
        REFRESH_COOKIE,
        { type: 'apiKey', in: 'cookie', name: REFRESH_COOKIE },
        'refresh-cookie',
      )
      .build(),
  );
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs-json',
    swaggerOptions: { persistAuthorization: true },
  });
}
