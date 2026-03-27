import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { apiGet, apiPost, ApiError } from '@/lib/api-client';
import { API_ROUTES } from '@/lib/constants/api-routes';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const search = request.nextUrl.search;
    const data = await apiGet(`${API_ROUTES.TEMPLATES.BASE}${search}`);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiError)
      return NextResponse.json({ message: error.message }, { status: error.status });
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as unknown;
    const data = await apiPost(API_ROUTES.TEMPLATES.BASE, body);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError)
      return NextResponse.json({ message: error.message }, { status: error.status });
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
