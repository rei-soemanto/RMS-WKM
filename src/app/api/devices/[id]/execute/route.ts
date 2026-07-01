import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { executeCommand } from '@/lib/teltonika';
import { getCurrentUser, requireRole } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !requireRole(user.role, 'OPERATOR')) {
    return NextResponse.json(
      { error: 'Insufficient permissions. OPERATOR role or higher required.' },
      { status: 403 }
    );
  }

  const { id: deviceId } = await params;
  const { commandString } = await request.json();

  if (!commandString || typeof commandString !== 'string') {
    return NextResponse.json(
      { error: 'commandString is required' },
      { status: 400 }
    );
  }

  // 1. Log the intent first (Auditing)
  const log = await prisma.deviceActionLog.create({
    data: {
      deviceId,
      userId: user.id,
      actionType: 'CLI_COMMAND',
      scopeUsed: 'command:execute',
      payload: { command: commandString },
      status: 'PENDING',
    },
  });

  try {
    // 2. Relay to Teltonika backend
    const result = await executeCommand(deviceId, commandString);

    // 3. Update state on success
    await prisma.deviceActionLog.update({
      where: { id: log.id },
      data: { status: 'SUCCESS' },
    });

    return NextResponse.json({ success: true, result });
  } catch (error: unknown) {
    // 4. Update state on failure
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await prisma.deviceActionLog.update({
      where: { id: log.id },
      data: { status: 'FAILED', errorMessage },
    });

    return NextResponse.json(
      { error: 'Failed to execute remote action', details: errorMessage },
      { status: 500 }
    );
  }
}
