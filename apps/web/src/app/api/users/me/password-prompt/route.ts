import { NextResponse } from 'next/server';
import { apiPatch, ApiError } from '@/lib/api-client';
import { API_ROUTES } from '@/lib/constants/api-routes';

/**
 * PATCH /api/users/me/password-prompt
 * Dismisses the first-login password prompt (sets mustChangePassword = false).
 * Called when the user clicks "Later" on the first-login modal.
 */
export async function PATCH(): Promise<NextResponse> {
  try {
    await apiPatch(API_ROUTES.USERS.ME_PASSWORD_PROMPT, {});
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof ApiError)
      return NextResponse.json({ message: error.message }, { status: error.status });
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
