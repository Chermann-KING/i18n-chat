import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { apiPost, ApiError } from '@/lib/api-client';
import { API_ROUTES } from '@/lib/constants/api-routes';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** POST /api/dispatches/:id/cancel — cancel a pending dispatch. */
export async function POST(_request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  try {
    const { id } = await params;
    const data = await apiPost(API_ROUTES.DISPATCHES.CANCEL(id), {});
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiError)
      return NextResponse.json({ message: error.message }, { status: error.status });
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
