import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { apiGet, ApiError } from '@/lib/api-client';
import { API_ROUTES } from '@/lib/constants/api-routes';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  try {
    const { id } = await params;
    const data = await apiGet(API_ROUTES.DISPATCHES.MESSAGES(id));
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiError)
      return NextResponse.json({ message: error.message }, { status: error.status });
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
