import { INestApplicationContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import type { Server, ServerOptions } from 'socket.io';
import { REDIS } from '../redis/redis.module';

/** Adapter Socket.IO berbasis Redis: banyak instance backend saling meneruskan siaran dan presence. */
export class RedisIoAdapter extends IoAdapter {
  private readonly pub: Redis;
  private readonly sub: Redis;
  private readonly origin: string;

  constructor(app: INestApplicationContext) {
    super(app);
    const redis = app.get<Redis>(REDIS);
    this.pub = redis.duplicate();
    this.sub = redis.duplicate();
    this.origin = app.get(ConfigService).getOrThrow<string>('FRONTEND_URL');
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, {
      ...options,
      cors: { origin: this.origin, credentials: true },
    }) as Server;
    server.adapter(createAdapter(this.pub, this.sub));
    return server;
  }

  /**
   * Nest memanggil close() sekali per namespace (paralel), lalu dispose() sekali di akhir.
   * Koneksi pub/sub ditutup di dispose() agar namespace lain masih bisa unsubscribe saat ditutup.
   */
  async dispose() {
    // quit() menunggu perintah yang sedang berjalan; kegagalan penutupan tidak perlu menggagalkan shutdown.
    await Promise.allSettled([this.pub.quit(), this.sub.quit()]);
  }
}
