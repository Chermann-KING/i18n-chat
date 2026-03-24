/**
 * Generic wrapper for paginated repository results.
 *
 * @template T - The entity type returned in each page.
 */
export interface PagedResult<T> {
  /** The items in the current page. */
  readonly data: T[];
  /** Total number of matching records across all pages. */
  readonly total: number;
}
