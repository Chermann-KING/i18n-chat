import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { apiDelete, ApiError } from '@/lib/api-client';
import { API_ROUTES } from '@/lib/constants/api-routes';

interface RouteContext {
  params: Promise<{ id: string; channelId: string }>;
}

/** DELETE /api/recipients/:id/channels/:channelId — remove a channel from a recipient. */
export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext,
): Promise<NextResponse> {
  try {
    const { id, channelId } = await params;
    await apiDelete(API_ROUTES.RECIPIENTS.CHANNEL(id, channelId));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof ApiError)
      return NextResponse.json({ message: error.message }, { status: error.status });
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
