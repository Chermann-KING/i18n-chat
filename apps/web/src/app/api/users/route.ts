import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { apiGet, apiPost, ApiError } from '@/lib/api-client';
import { API_ROUTES } from '@/lib/constants/api-routes';

/** GET /api/users — list all staff users (admin only). */
export async function GET(): Promise<NextResponse> {
  try {
    const data = await apiGet(API_ROUTES.USERS.BASE);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiError)
      return NextResponse.json({ message: error.message }, { status: error.status });
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

/** POST /api/users — create a staff user (admin only). */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as unknown;
    const data = await apiPost(API_ROUTES.USERS.BASE, body);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError)
      return NextResponse.json({ message: error.message }, { status: error.status });
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
