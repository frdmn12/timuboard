import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ApiErrorResponses } from './api-envelope.decorator';

/** Untuk controller yang dilindungi JwtAuthGuard global: gembok Bearer + galat 401 & 429 pada setiap route. */
export const ApiSecured = () =>
  applyDecorators(ApiBearerAuth(), ApiErrorResponses(401, 429));

/** Parameter path berformat UUID. */
export const ApiUuidParam = (name: string, description: string) =>
  ApiParam({ name, type: String, format: 'uuid', description });
