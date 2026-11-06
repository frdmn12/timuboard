import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

interface ErrorResponseBody {
  success: false;
  error: {
    code: string;
    message: string;
    details: unknown;
  };
  meta: {
    timestamp: string;
  };
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const { status, code, message, details } = this.resolveException(exception);

    // Log unexpected errors (5xx) with full stack trace for debugging.
    // Expected errors (4xx) don't need noisy logs.
    if (status >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.stack : exception,
      );
    }

    const body: ErrorResponseBody = {
      success: false,
      error: { code, message, details },
      meta: { timestamp: new Date().toISOString() },
    };

    response.status(status).json(body);
  }

  private resolveException(exception: unknown): {
    status: number;
    code: string;
    message: string;
    details: unknown;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      // class-validator errors come as { message: string[], ... }
      const isValidationError =
        typeof response === 'object' &&
        response !== null &&
        Array.isArray((response as Record<string, unknown>).message);

      // Kode kesalahan domain (mis. EMAIL_NOT_VERIFIED) boleh dikirim lewat { code, message }.
      const customCode =
        typeof response === 'object' &&
        response !== null &&
        typeof (response as Record<string, unknown>).code === 'string'
          ? ((response as Record<string, unknown>).code as string)
          : null;

      return {
        status,
        code: customCode ?? this.statusToCode(status),
        message: isValidationError
          ? 'Validation failed'
          : this.extractMessage(response),
        details: isValidationError
          ? (response as Record<string, unknown>).message
          : null,
      };
    }

    // Unknown/unhandled error — never leak internal details to client
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      details: null,
    };
  }

  private extractMessage(response: unknown): string {
    if (typeof response === 'string') return response;
    if (
      typeof response === 'object' &&
      response !== null &&
      'message' in response
    ) {
      const msg = (response as Record<string, unknown>).message;
      return typeof msg === 'string' ? msg : JSON.stringify(msg);
    }
    return 'An error occurred';
  }

  private statusToCode(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
    };
    return map[status] ?? 'ERROR';
  }
}
