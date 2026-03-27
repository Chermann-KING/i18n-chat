import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ACCESS_TOKEN_COOKIE, ApiError } from '@/lib/api-client';
import { API_ROUTES } from '@/lib/constants/api-routes';

/**
 * GET /api/dispatches/export — proxy the CSV export from NestJS.
 * Streams the response directly to the client with the correct content-type.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

    const search = request.nextUrl.search;
    const apiResponse = await fetch(`${API_ROUTES.DISPATCHES.CSV}${search}`, {
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });

    if (!apiResponse.ok) {
      throw new ApiError(apiResponse.status, await apiResponse.text());
    }

    const csv = await apiResponse.text();
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="dispatches.csv"',
      },
    });
  } catch (error) {
    if (error instanceof ApiError)
      return NextResponse.json({ message: error.message }, { status: error.status });
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
