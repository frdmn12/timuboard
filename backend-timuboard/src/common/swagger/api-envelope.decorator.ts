import { applyDecorators, type Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiProperty,
  ApiResponse,
  getSchemaPath,
  type ApiResponseOptions,
} from '@nestjs/swagger';

/** Dokumentasi bentuk `meta` pada setiap respons. */
export class MetaDto {
  @ApiProperty({ format: 'date-time', example: '2026-01-15T08:30:00.000Z' })
  timestamp!: string;
}

export class ErrorBodyDto {
  @ApiProperty({
    description:
      'Kode galat yang stabil untuk dipakai klien. Kode domain (mis. EMAIL_NOT_VERIFIED) atau kode HTTP umum (BAD_REQUEST, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT, TOO_MANY_REQUESTS, INTERNAL_SERVER_ERROR).',
    example: 'BAD_REQUEST',
  })
  code!: string;

  @ApiProperty({ example: 'Validation failed' })
  message!: string;

  @ApiProperty({
    type: [String],
    nullable: true,
    description:
      'Pada galat validasi (400) berisi daftar pesan per field; selain itu null.',
    example: ['email must be an email'],
  })
  details!: string[] | null;
}

export class ErrorEnvelopeDto {
  @ApiProperty({ enum: [false], example: false })
  success!: false;

  @ApiProperty({ type: ErrorBodyDto })
  error!: ErrorBodyDto;

  @ApiProperty({ type: MetaDto })
  meta!: MetaDto;
}

interface EnvelopeOptions {
  /** Status HTTP sukses (bawaan 200). */
  status?: number;
  /** `data` berupa larik dari model. */
  isArray?: boolean;
  description?: string;
  headers?: ApiResponseOptions['headers'];
}

/**
 * Respons sukses berbentuk `{ success: true, data: <model>, meta: { timestamp } }`,
 * sesuai ResponseInterceptor. `model` boleh `String` untuk data berupa teks.
 */
export function ApiEnvelopeResponse(
  model: Type<unknown> | StringConstructor,
  options: EnvelopeOptions = {},
) {
  const {
    status = 200,
    isArray = false,
    description = 'Sukses.',
    headers,
  } = options;
  const item =
    model === String
      ? { type: 'string' }
      : { $ref: getSchemaPath(model as Type<unknown>) };
  return applyDecorators(
    ...(model === String ? [] : [ApiExtraModels(model as Type<unknown>)]),
    ApiExtraModels(MetaDto),
    ApiResponse({
      status,
      description,
      headers,
      schema: {
        type: 'object',
        required: ['success', 'data', 'meta'],
        properties: {
          success: { type: 'boolean', enum: [true], example: true },
          data: isArray ? { type: 'array', items: item } : item,
          meta: { $ref: getSchemaPath(MetaDto) },
        },
      },
    }),
  );
}

const DEFAULT_ERROR_DESCRIPTIONS: Record<number, string> = {
  400: 'Permintaan tidak valid (validasi gagal atau aturan bisnis dilanggar).',
  401: 'Access token tidak ada, tidak valid, atau kedaluwarsa.',
  403: 'Tidak diizinkan.',
  404: 'Sumber daya tidak ditemukan.',
  409: 'Konflik dengan data yang sudah ada.',
  429: 'Terlalu banyak permintaan (rate limit).',
  503: 'Layanan tidak tersedia.',
};

/**
 * Respons galat standar `{ success: false, error: { code, message, details }, meta }`.
 * Beri `[status, deskripsi]` untuk deskripsi khusus endpoint.
 */
export function ApiErrorResponses(...items: (number | [number, string])[]) {
  return applyDecorators(
    ApiExtraModels(ErrorEnvelopeDto),
    ...items.map((item) => {
      const [status, description] = Array.isArray(item)
        ? item
        : [item, DEFAULT_ERROR_DESCRIPTIONS[item] ?? 'Galat.'];
      return ApiResponse({
        status,
        description,
        schema: { $ref: getSchemaPath(ErrorEnvelopeDto) },
      });
    }),
  );
}
