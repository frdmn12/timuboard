import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import Redis from 'ioredis';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { validateEnv } from './config/env.validation';
import { HealthController } from './health/health.controller';
import { REDIS, RedisModule } from './redis/redis.module';
import { BoardsModule } from './boards/boards.module';
import { CommentsModule } from './comments/comments.module';
import { TasksModule } from './tasks/tasks.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RealtimeModule } from './realtime/realtime.module';
import { RealtimePublisherModule } from './realtime/realtime-publisher.module';
import { UsersModule } from './users/users.module';
import { PlaygroundModule } from './playground/playground.module';

@Module({
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    // Urutan penting: batasi laju dulu, lalu cek JWT. Route publik ditandai @Public().
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: ['.env', '../.env'],
    }),
    RedisModule,
    // Hitungan rate limit disimpan di Redis agar konsisten di banyak instance.
    ThrottlerModule.forRootAsync({
      inject: [REDIS, ConfigService],
      useFactory: (redis: Redis, config: ConfigService) => ({
        throttlers: [{ ttl: 60_000, limit: 100 }],
        storage: new ThrottlerStorageRedisService(redis),
        // Hanya dipakai tes e2e yang bukan menguji rate limit (ditolak di production).
        skipIf: () => config.get<boolean>('THROTTLE_DISABLED') === true,
      }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const production = config.get<string>('NODE_ENV') === 'production';
        return {
          type: 'postgres' as const,
          host: config.getOrThrow<string>('DB_HOST'),
          port: config.getOrThrow<number>('DB_PORT'),
          username: config.getOrThrow<string>('POSTGRES_USER'),
          password: config.getOrThrow<string>('POSTGRES_PASSWORD'),
          database: config.getOrThrow<string>('POSTGRES_DB'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: !production,
          // Production: skema hanya berubah lewat migrasi (npm run migration:generate).
          migrations: [__dirname + '/migrations/*{.ts,.js}'],
          migrationsRun: production,
          logging: ['error', 'warn'],
        };
      },
    }),
    UsersModule,
    AuthModule,
    BoardsModule,
    TasksModule,
    CommentsModule,
    NotificationsModule,
    RealtimePublisherModule,
    RealtimeModule,
    PlaygroundModule,
  ],
})
export class AppModule {}
