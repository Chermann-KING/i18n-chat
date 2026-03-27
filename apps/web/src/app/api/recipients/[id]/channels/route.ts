import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { apiPost, ApiError } from '@/lib/api-client';
import { API_ROUTES } from '@/lib/constants/api-routes';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** POST /api/recipients/:id/channels — add a channel to a recipient. */
export async function POST(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body = (await request.json()) as unknown;
    const data = await apiPost(API_ROUTES.RECIPIENTS.CHANNELS(id), body);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError)
      return NextResponse.json({ message: error.message }, { status: error.status });
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
