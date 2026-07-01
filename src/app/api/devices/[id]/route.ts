import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDevice } from '@/lib/teltonika';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Try to get fresh data from Teltonika
    let rmsDevice = null;
    try {
      const rmsData = await getDevice(id);
      rmsDevice = rmsData?.data || null;
    } catch {
      console.warn(`Failed to fetch device ${id} from Teltonika API`);
    }

    // Get device from local database
    const device = await prisma.device.findUnique({
      where: { id },
      include: {
        actionLogs: {
          orderBy: { executedAt: 'desc' },
          take: 20,
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
        },
      },
    });

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    return NextResponse.json({
      device,
      rmsData: rmsDevice,
    });
  } catch (error) {
    console.error('Failed to fetch device:', error);
    return NextResponse.json(
      { error: 'Failed to fetch device' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { name, macAddress, serialNumber, isActive } = await request.json();

  try {
    const device = await prisma.device.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(macAddress !== undefined && { macAddress }),
        ...(serialNumber !== undefined && { serialNumber }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ device });
  } catch (error) {
    console.error('Failed to update device:', error);
    return NextResponse.json(
      { error: 'Failed to update device' },
      { status: 500 }
    );
  }
}
