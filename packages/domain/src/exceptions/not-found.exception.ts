import { AppException } from './app.exception';

/**
 * Thrown when a requested entity cannot be found in the data store.
 *
 * @example
 * ```ts
 * throw new NotFoundException('Recipient', recipientId);
 * ```
 */
export class NotFoundException extends AppException {
  constructor(entityName: string, entityId: string) {
    super(`${entityName} with id "${entityId}" was not found.`, 'NOT_FOUND', {
      entityName,
      entityId,
    });
  }
}
