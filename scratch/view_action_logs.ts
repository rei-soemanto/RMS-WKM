import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

async function viewLogs() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  const prisma = new PrismaClient({ adapter });

  console.log("Fetching latest DeviceActionLog entries...");
  const logs = await prisma.deviceActionLog.findMany({
    orderBy: { executedAt: 'desc' },
    take: 5,
  });

  console.log(JSON.stringify(logs, null, 2));
  await prisma.$disconnect();
}

viewLogs();
