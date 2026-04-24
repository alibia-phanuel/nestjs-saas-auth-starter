import { PrismaClient, UserStatus } from '../generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? '',
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // ── Rôles ─────────────────────────────────────────
  const roles = [
    {
      name: 'admin',
      description: 'Full access to all resources',
      permissions: [
        'users:read',
        'users:write',
        'users:delete',
        'orgs:read',
        'orgs:write',
        'orgs:delete',
      ],
    },
    {
      name: 'user',
      description: 'Standard user access',
      permissions: ['users:read:own', 'orgs:read'],
    },
    {
      name: 'moderator',
      description: 'Moderation access',
      permissions: ['users:read', 'orgs:read'],
    },
  ];

  for (const roleData of roles) {
    const role = await prisma.role.upsert({
      where: { name: roleData.name },
      update: {},
      create: {
        name: roleData.name,
        description: roleData.description,
        permissions: {
          create: roleData.permissions.map((action) => ({ action })),
        },
      },
    });
    console.log(`✅ Role created: ${role.name}`);
  }

  // ── Admin user ────────────────────────────────────
  const adminRole = await prisma.role.findUnique({
    where: { name: 'admin' },
  });

  if (!adminRole) {
    throw new Error('Admin role not found');
  }

  const hashedPassword = await bcrypt.hash('Admin123!', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@nestjs-saas.com' },
    update: {},
    create: {
      email: 'admin@nestjs-saas.com',
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      status: UserStatus.ACTIVE,
      emailVerified: true,
      roles: {
        create: {
          roleId: adminRole.id,
        },
      },
    },
  });

  console.log(`✅ Admin user created: ${adminUser.email}`);
  console.log(`🔑 Password: Admin123!`);
  console.log('⚠️  Change this password in production!');

  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
