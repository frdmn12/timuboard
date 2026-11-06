import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { RedisIoAdapter } from './realtime/redis-io.adapter';
import { requestContextMiddleware } from './realtime/request-context';
import { ResponseInterceptor } from './common/interceptors/response/response.interceptor';

/** Konfigurasi HTTP yang dipakai bersama oleh main.ts dan test e2e. */
export function configureApp(app: INestApplication) {
  const config = app.get(ConfigService);
  // Di belakang Caddy: tanpa ini semua klien terbaca satu IP dan rate limit /auth salah sasaran.
  (app as NestExpressApplication).set('trust proxy', 1);
  app.use(helmet());
  app.use(cookieParser());
  app.use(requestContextMiddleware);
  app.useWebSocketAdapter(new RedisIoAdapter(app));
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({
    origin: config.getOrThrow<string>('FRONTEND_URL'),
    credentials: true,
  });
}
