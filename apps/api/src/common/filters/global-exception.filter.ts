import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppException, NotFoundException, UnauthorizedException } from '@i18n-chat/domain';
import { PinoLoggerService } from '../logger/pino-logger.service';

/** Shape of every error response emitted by the API. */
interface ErrorResponse {
  readonly statusCode: number;
  readonly error: string;
  readonly message: string;
  readonly correlationId: string | undefined;
  readonly timestamp: string;
  readonly path: string;
}

/** Returns the HTTP status code that corresponds to a domain {@link AppException}. */
function domainStatusFor(exception: AppException): number {
  if (exception instanceof NotFoundException) return HttpStatus.NOT_FOUND;
  if (exception instanceof UnauthorizedException) return HttpStatus.UNAUTHORIZED;
  return HttpStatus.UNPROCESSABLE_ENTITY;
}

/**
 * Catches every unhandled exception and serialises it into a consistent
 * JSON error envelope.
 *
 * Priority:
 * 1. NestJS `HttpException` — uses its own status and message.
 * 2. Domain `AppException` — mapped to a semantic HTTP status.
 * 3. Unknown errors — returned as 500 Internal Server Error.
 *
 * All errors are logged at the `error` level via {@link PinoLoggerService}.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLoggerService) {}

  /** @inheritdoc */
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request & { correlationId?: string }>();
    const response = ctx.getResponse<Response>();

    const { statusCode, message } = this.resolve(exception);
    const { correlationId } = request;

    this.logger.error(
      `[${statusCode}] ${message}`,
      exception instanceof Error ? exception.stack : undefined,
      GlobalExceptionFilter.name,
    );

    const body: ErrorResponse = {
      statusCode,
      error: HttpStatus[statusCode] ?? 'Error',
      message,
      correlationId,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(statusCode).json(body);
  }

  /**
   * Derives HTTP status code and user-facing message from the thrown value.
   *
   * @param exception - The caught exception (may be any type).
   */
  private resolve(exception: unknown): { statusCode: number; message: string } {
    if (exception instanceof HttpException) {
      return this.fromHttpException(exception);
    }

    if (exception instanceof AppException) {
      return { statusCode: domainStatusFor(exception), message: exception.message };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred.',
    };
  }

  /**
   * Extracts status and message from a NestJS {@link HttpException}.
   *
   * The exception response can be a string or an object with a `message`
   * field (the default shape produced by `BadRequestException` etc.).
   */
  private fromHttpException(exception: HttpException): { statusCode: number; message: string } {
    const statusCode = exception.getStatus();
    const raw = exception.getResponse();

    if (typeof raw === 'string') return { statusCode, message: raw };

    const nested = (raw as { message?: string | string[] }).message;
    const message = nested ? String(nested) : exception.message;

    return { statusCode, message };
  }
}
