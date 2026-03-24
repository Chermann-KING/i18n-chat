import { AppException } from './app.exception';

/**
 * Thrown when an authenticated user attempts an action they are not authorised to perform.
 */
export class UnauthorizedException extends AppException {
  constructor(action: string, userId?: string) {
    super(`User is not authorised to perform action: "${action}".`, 'UNAUTHORIZED', {
      action,
      userId,
    });
  }
}
