import { NextResponse } from 'next/server';
import { getCurrentUser, requireRole } from '@/lib/auth';
import { createRemoteSession, getRemoteSessions, getChannelStatus } from '@/lib/teltonika';
import { prisma } from '@/lib/prisma';

// Helper to delay execution in async flow
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * POST /api/devices/[id]/connect
 * Body: { access_id: number, duration?: number }
 * Creates a timed RMS Connect session, polls for completion, and returns the temporary URL.
 * Requires OPERATOR+ role. Action is audited to DeviceActionLog.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !requireRole(user.role, 'OPERATOR')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { id: deviceId } = await params;
  const { access_id, duration = 3600 } = await request.json();

  if (!access_id) {
    return NextResponse.json({ error: 'access_id is required' }, { status: 400 });
  }

  // Audit the intent
  const log = await prisma.deviceActionLog.create({
    data: {
      deviceId,
      userId: user.id,
      actionType: 'REMOTE_ACCESS',
      scopeUsed: 'device_remote_access:write',
      payload: { access_id, duration },
      status: 'PENDING',
    },
  });

  try {
    // 1. Initiate connection channel
    const initResult = await createRemoteSession(access_id, duration);
    const channelName = initResult.meta?.channel;

    if (!channelName) {
      throw new Error('No status channel returned from Teltonika API');
    }

    // 2. Poll for connection resolution
    let finalSessionUrl = '';
    let finalSessionExpiry = '';
    let errorMessage = '';
    const maxRetries = 10;

    for (let i = 0; i < maxRetries; i++) {
      // Wait before checking (connections take a few seconds)
      await delay(2000);

      // Check if session link is generated
      const sessionRes = await getRemoteSessions(access_id);
      const activeSession = sessionRes.data?.find((s) => s.url);

      if (activeSession) {
        finalSessionUrl = activeSession.url;
        finalSessionExpiry = activeSession.expires_at;
        break;
      }

      // Check the channel status logs to catch errors early (timeouts, credit issues, etc.)
      const channelRes = await getChannelStatus(channelName);
      const deviceLogs = channelRes.data?.[deviceId] || [];
      const errorLog = deviceLogs.find((item) => item.status === 'error');

      if (errorLog) {
        errorMessage = `Connection failed: ${errorLog.value}${
          errorLog.errorCode ? ` (Error Code ${errorLog.errorCode})` : ''
        }. Check if the device is connected to internet and the account has active credits.`;
        throw new Error(errorMessage);
      }
    }

    if (!finalSessionUrl) {
      throw new Error(
        'Connection timed out. The device did not respond within the timeframe. Please check your credit balance or if the router is online.'
      );
    }

    // Update log to SUCCESS
    await prisma.deviceActionLog.update({
      where: { id: log.id },
      data: { status: 'SUCCESS' },
    });

    return NextResponse.json({ url: finalSessionUrl, expires_at: finalSessionExpiry });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Update log to FAILED
    await prisma.deviceActionLog.update({
      where: { id: log.id },
      data: { status: 'FAILED', errorMessage },
    });

    return NextResponse.json(
      { error: 'Failed to create remote session', details: errorMessage },
      { status: 500 }
    );
  }
}
