import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { apiPatch, apiDelete, ApiError } from '@/lib/api-client';
import { API_ROUTES } from '@/lib/constants/api-routes';

interface RouteContext {
  params: Promise<{ id: string; lang: string }>;
}

/** PATCH /api/templates/:id/translations/:lang — update a translation. */
export async function PATCH(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  try {
    const { id, lang } = await params;
    const body = (await request.json()) as unknown;
    const data = await apiPatch(API_ROUTES.TEMPLATES.TRANSLATION(id, lang), body);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiError)
      return NextResponse.json({ message: error.message }, { status: error.status });
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

/** DELETE /api/templates/:id/translations/:lang — remove a translation. */
export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext,
): Promise<NextResponse> {
  try {
    const { id, lang } = await params;
    await apiDelete(API_ROUTES.TEMPLATES.TRANSLATION(id, lang));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof ApiError)
      return NextResponse.json({ message: error.message }, { status: error.status });
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
