const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function main() {
  console.log('🌱 Starting seed...');
  
  // Test database connection
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }

  // Create Admin only
  const existingSuperAdmin = await prisma.user.findUnique({
    where: { email: 'admin@decorvault.online' }
  });

  if (!existingSuperAdmin) {
    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    
    await prisma.user.create({
      data: {
        email: 'admin@decorvault.online',
        hashedPassword: hashedPassword,
        fullName: 'Admin User',
        phoneNumber: null,
        role: 'ADMIN',
        isActive: true,
        emailVerified: true,
      }
    });
    console.log('✅ Admin created: admin@decorvault.online / Admin@123');
  } else {
    console.log('⚠️ Admin already exists');
  }

  console.log('🎉 Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
