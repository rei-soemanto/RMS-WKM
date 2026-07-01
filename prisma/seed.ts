import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 Seeding database...');

  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });

  const prisma = new PrismaClient({ adapter });

  // Create default SUPERADMIN user
  const passwordHash = await bcrypt.hash('admin123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@wkm.co.id' },
    update: {},
    create: {
      email: 'admin@wkm.co.id',
      passwordHash,
      name: 'Admin WKM',
      role: 'SUPERADMIN',
    },
  });

  console.log(`✅ Created admin user: ${admin.email} (role: ${admin.role})`);
  console.log('   Login: admin@wkm.co.id / admin123');
  console.log('');
  console.log('🎉 Seeding complete!');

  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  });
