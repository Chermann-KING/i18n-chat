import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import type { ZodSchema } from 'zod';

/**
 * Global validation pipe that validates an incoming request body against a
 * Zod schema.
 *
 * Usage — apply per-endpoint:
 * ```ts
 * @Body(new ZodValidationPipe(LoginSchema)) body: TLogin
 * ```
 *
 * On validation failure it throws a NestJS `BadRequestException` containing
 * the flattened Zod error messages so the caller receives a structured
 * `400 Bad Request` response.
 */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private readonly schema: ZodSchema<T>) {}

  /**
   * Parses and validates `value` against the configured Zod schema.
   *
   * @param value - Raw request body or parameter value.
   * @returns The parsed, typed value on success.
   * @throws {BadRequestException} When validation fails.
   */
  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    return result.data;
  }
}
