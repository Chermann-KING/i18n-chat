import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { API_ROUTES } from '@/lib/constants/api-routes';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/api-client';

const ACCESS_TOKEN_MAX_AGE = 4 * 60 * 60; // 4 hours
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

/**
 * POST /api/auth/refresh
 * Uses the HttpOnly refresh token cookie to obtain a new access token from NestJS.
 * Rotates both tokens on success.
 */
export async function POST(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!refreshToken) {
    return NextResponse.json({ message: 'No refresh token' }, { status: 401 });
  }

  const apiResponse = await fetch(API_ROUTES.AUTH.REFRESH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${refreshToken}`,
    },
  });

  if (!apiResponse.ok) {
    cookieStore.delete(ACCESS_TOKEN_COOKIE);
    cookieStore.delete(REFRESH_TOKEN_COOKIE);
    return NextResponse.json({ message: 'Session expired' }, { status: 401 });
  }

  const data = (await apiResponse.json()) as { accessToken: string; refreshToken: string };

  cookieStore.set(ACCESS_TOKEN_COOKIE, data.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  cookieStore.set(REFRESH_TOKEN_COOKIE, data.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth/refresh',
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });

  return NextResponse.json({ ok: true });
}
