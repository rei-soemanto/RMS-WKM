import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDevices } from '@/lib/teltonika';
import { getCurrentUser, requireRole } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // First, try to fetch from Teltonika and sync to local DB
    try {
      const rmsData = await getDevices();

      if (rmsData?.data && Array.isArray(rmsData.data)) {
        // Sync devices to local database
        for (const device of rmsData.data) {
          await prisma.device.upsert({
            where: { id: String(device.id) },
            update: {
              name: device.name || 'Unknown Device',
              macAddress: device.mac || null,
              serialNumber: device.serial || null,
              isActive: Number(device.status) === 1,
            },
            create: {
              id: String(device.id),
              name: device.name || 'Unknown Device',
              macAddress: device.mac || null,
              serialNumber: device.serial || null,
              isActive: Number(device.status) === 1,
            },
          });
        }
      }
    } catch (rmsError) {
      // If Teltonika API fails, we still return cached local data
      console.warn('Failed to sync with Teltonika API:', rmsError);
    }

    // Always return from local database (cached)
    const devices = await prisma.device.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { actionLogs: true },
        },
      },
    });

    return NextResponse.json({ devices });
  } catch (error) {
    console.error('Failed to fetch devices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch devices' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !requireRole(user.role, 'MANAGER')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const { id, name, macAddress, serialNumber } = await request.json();

    const device = await prisma.device.create({
      data: {
        id,
        name,
        macAddress: macAddress || null,
        serialNumber: serialNumber || null,
      },
    });

    return NextResponse.json({ device }, { status: 201 });
  } catch (error) {
    console.error('Failed to create device:', error);
    return NextResponse.json(
      { error: 'Failed to create device' },
      { status: 500 }
    );
  }
}
