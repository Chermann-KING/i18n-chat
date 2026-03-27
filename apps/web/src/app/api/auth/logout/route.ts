import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { API_ROUTES } from '@/lib/constants/api-routes';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/api-client';

/**
 * POST /api/auth/logout
 * Clears both JWT cookies and notifies NestJS so the refresh token is revoked.
 */
export async function POST(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (accessToken) {
    await fetch(API_ROUTES.AUTH.LOGOUT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(() => undefined);
  }

  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);

  return NextResponse.json({ ok: true });
}
