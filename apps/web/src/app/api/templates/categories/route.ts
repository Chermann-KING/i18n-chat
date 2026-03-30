import { NextResponse } from 'next/server';

/**
 * GET /api/templates/categories — returns the fixed list of category slugs.
 *
 * Values mirror {@link TEMPLATE_CATEGORIES} in `@i18n-chat/domain`.
 * Keep both in sync when adding or removing categories.
 */
export function GET(): NextResponse {
  return NextResponse.json([
    'general',
    'administrative',
    'medical',
    'juridique',
    'rh',
    'social',
    'communication',
  ]);
}
