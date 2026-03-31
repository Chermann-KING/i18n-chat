import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { API_ROUTES } from '@/lib/constants/api-routes';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/api-client';

/** Cookie TTL constants (in seconds). */
const ACCESS_TOKEN_MAX_AGE = 4 * 60 * 60; // 4 hours
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

/**
 * POST /api/auth/login
 * Proxies credentials to NestJS, then stores both JWT tokens in HttpOnly cookies.
 * The client never sees the raw tokens.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as unknown;

  const apiResponse = await fetch(API_ROUTES.AUTH.LOGIN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!apiResponse.ok) {
    const error = (await apiResponse.json().catch(() => ({ message: 'Login failed' }))) as {
      message?: string;
    };
    return NextResponse.json(
      { message: error.message ?? 'Login failed' },
      { status: apiResponse.status },
    );
  }

  const data = (await apiResponse.json()) as { accessToken: string; refreshToken: string };

  const cookieStore = await cookies();
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

  // Fetch the user profile to get the preferred locale and first-login flag.
  // The cookie is already set above so this server-side fetch can use it directly.
  const meResponse = await fetch(API_ROUTES.USERS.ME, {
    headers: { Authorization: `Bearer ${data.accessToken}` },
  });

  if (meResponse.ok) {
    const me = (await meResponse.json()) as {
      preferredLanguageCode: string;
      mustChangePassword: boolean;
    };
    return NextResponse.json({
      ok: true,
      preferredLanguageCode: me.preferredLanguageCode,
      mustChangePassword: me.mustChangePassword,
    });
  }

  return NextResponse.json({ ok: true, preferredLanguageCode: 'fr', mustChangePassword: false });
}
