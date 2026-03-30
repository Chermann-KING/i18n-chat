import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { apiPatch, ApiError } from '@/lib/api-client';
import { API_ROUTES } from '@/lib/constants/api-routes';

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as unknown;
    const data = await apiPatch(API_ROUTES.USERS.ME_PASSWORD, body);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiError)
      return NextResponse.json({ message: error.message }, { status: error.status });
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
