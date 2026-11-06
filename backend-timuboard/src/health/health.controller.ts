import { ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import {
  ApiEnvelopeResponse,
  ApiErrorResponses,
} from '../common/swagger/api-envelope.decorator';
import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { Public } from '../common/decorators/public.decorator';
import { REDIS } from '../redis/redis.module';

export class HealthDto {
  @ApiProperty({ enum: ['ok', 'error'] })
  status!: 'ok' | 'error';
  @ApiProperty({ enum: ['up', 'down'], description: 'Status Postgres.' })
  db!: 'up' | 'down';
  @ApiProperty({ enum: ['up', 'down'], description: 'Status Redis.' })
  redis!: 'up' | 'down';
}

@ApiTags('Health')
@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  /** Dipakai docker/orkestrator: 200 bila Postgres dan Redis menjawab. */
  @ApiOperation({
    summary: 'Cek kesehatan layanan',
    description:
      'Memeriksa koneksi Postgres dan Redis. 200 bila keduanya menjawab; 503 bila salah satu mati. Tidak dikenai rate limit.',
  })
  @ApiEnvelopeResponse(HealthDto, { description: 'Postgres dan Redis sehat.' })
  @ApiErrorResponses([
    503,
    'Salah satu dependensi mati. Rincian status tidak ikut dikirim: filter galat global menghasilkan `error.code` = `ERROR`.',
  ])
  @Get()
  async check() {
    const [db, redis] = await Promise.all([
      this.dataSource.query('SELECT 1').then(
        () => 'up',
        () => 'down',
      ),
      this.redis.ping().then(
        () => 'up',
        () => 'down',
      ),
    ]);
    const body = {
      status: db === 'up' && redis === 'up' ? 'ok' : 'error',
      db,
      redis,
    };
    if (body.status !== 'ok') throw new ServiceUnavailableException(body);
    return body;
  }
}
