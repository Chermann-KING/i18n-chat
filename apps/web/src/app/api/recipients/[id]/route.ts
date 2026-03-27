import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { apiGet, apiPatch, apiDelete, ApiError } from '@/lib/api-client';
import { API_ROUTES } from '@/lib/constants/api-routes';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  try {
    const { id } = await params;
    const data = await apiGet(API_ROUTES.RECIPIENTS.BY_ID(id));
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiError)
      return NextResponse.json({ message: error.message }, { status: error.status });
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body = (await request.json()) as unknown;
    const data = await apiPatch(API_ROUTES.RECIPIENTS.BY_ID(id), body);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiError)
      return NextResponse.json({ message: error.message }, { status: error.status });
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await params;
    await apiDelete(API_ROUTES.RECIPIENTS.BY_ID(id));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof ApiError)
      return NextResponse.json({ message: error.message }, { status: error.status });
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
