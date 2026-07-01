import { NextResponse } from 'next/server';
import { getCurrentUser, requireRole } from '@/lib/auth';
import { getRemoteAccessConfigs } from '@/lib/teltonika';

/**
 * GET /api/devices/[id]/remote-access
 * Returns the list of RMS Connect configs (HTTP, SSH, TCP) for this device.
 * Requires OPERATOR+ role.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !requireRole(user.role, 'OPERATOR')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const data = await getRemoteAccessConfigs(id);
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch remote access configs', details: message },
      { status: 500 }
    );
  }
}
