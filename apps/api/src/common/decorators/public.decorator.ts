import { SetMetadata } from '@nestjs/common';

/** Metadata key used by {@link JwtAuthGuard} to skip authentication. */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route handler as publicly accessible — no JWT required.
 *
 * Applied on endpoints such as `POST /auth/login` that must be reachable
 * before the caller holds a token.
 *
 * @example
 * ```ts
 * @Public()
 * @Post('login')
 * login(@Body() dto: TLogin) { ... }
 * ```
 */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);
