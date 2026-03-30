import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { apiGet, apiPatch, ApiError } from '@/lib/api-client';
import { API_ROUTES } from '@/lib/constants/api-routes';

export async function GET(): Promise<NextResponse> {
  try {
    const data = await apiGet(API_ROUTES.USERS.ME);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiError)
      return NextResponse.json({ message: error.message }, { status: error.status });
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as unknown;
    const data = await apiPatch(API_ROUTES.USERS.ME_PROFILE, body);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiError)
      return NextResponse.json({ message: error.message }, { status: error.status });
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
