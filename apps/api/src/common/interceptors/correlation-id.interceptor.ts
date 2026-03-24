import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import type { Observable } from 'rxjs';

/** HTTP header used to propagate the correlation ID across service boundaries. */
export const CORRELATION_ID_HEADER = 'x-correlation-id';

/**
 * Attaches a correlation ID to every inbound HTTP request and outbound response.
 *
 * If the caller already supplies an `x-correlation-id` header, that value is
 * re-used so the ID can be traced end-to-end across multiple services.
 * Otherwise a new UUID v4 is generated.
 *
 * The ID is:
 * - Stored on `request['correlationId']` for downstream consumers (e.g. the logger).
 * - Echoed back in the `x-correlation-id` response header.
 */
@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  /** @inheritdoc */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request & { correlationId: string }>();
    const response = context.switchToHttp().getResponse<Response>();

    const correlationId =
      (request.headers[CORRELATION_ID_HEADER] as string | undefined) ?? randomUUID();

    request.correlationId = correlationId;
    response.setHeader(CORRELATION_ID_HEADER, correlationId);

    return next.handle();
  }
}
