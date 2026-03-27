import { NextResponse } from 'next/server';
import { apiGet, ApiError } from '@/lib/api-client';
import { API_ROUTES } from '@/lib/constants/api-routes';

/**
 * GET /api/auth/me
 * Proxies the NestJS `/auth/me` endpoint using the stored access token cookie.
 * Used by React Query's `useQuery` to check auth state on the client.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const user = await apiGet(API_ROUTES.AUTH.ME);
    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
}
