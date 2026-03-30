/**
 * ISO 639-1 code of the language used as a fallback when no translation
 * exists for a recipient's preferred language.
 */
export const FALLBACK_LANGUAGE_CODE = 'en' as const;

/**
 * Fixed list of template categories available in the platform.
 *
 * **Design rationale — why a fixed list?**
 * For a Belgian public-sector institution with a stable functional perimeter,
 * categories change infrequently and must remain consistent across templates.
 * A free-text field risks fragmentation (`"Admin"` vs `"admin"` vs `"administratif"`),
 * while a fixed enum guarantees coherence with zero maintenance overhead.
 *
 * **How to evolve to a CRUD-managed list:**
 * 1. Create a `template_categories` table with `{ id, slug, label, isActive }`.
 * 2. Seed it with the values below as the initial dataset.
 * 3. Replace this constant with an `ICategoryRepository` port + Prisma adapter.
 * 4. Add `GET/POST/PATCH/DELETE /api/v1/template-categories` endpoints (admin only).
 * 5. Add a "Catégories" section under Paramètres in the web UI.
 * 6. The `category` column on `templates` becomes a FK to `template_categories.slug`.
 */
export const TEMPLATE_CATEGORIES = [
  'general',
  'administrative',
  'medical',
  'juridique',
  'rh',
  'social',
  'communication',
] as const;

/** Union type derived from {@link TEMPLATE_CATEGORIES}. */
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

/**
 * Number of days after which anonymous recipient targets are purged (GDPR).
 */
export const ANONYMOUS_TARGET_TTL_DAYS = 30 as const;

/**
 * Maximum number of recipients allowed in a single dispatch.
 */
export const MAX_RECIPIENTS_PER_DISPATCH = 10_000 as const;
