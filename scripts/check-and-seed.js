const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const path = require('path');

const prisma = new PrismaClient();

(async () => {
  try {
    const count = await prisma.user.count();
    if (count === 0) {
      console.log('[check-and-seed] DB vacía: corriendo seed...');
      const tsxBin = path.join(__dirname, '..', 'node_modules', '.bin', 'tsx');
      execSync(`"${tsxBin}" prisma/seed.ts`, { stdio: 'inherit' });
    } else {
      console.log(`[check-and-seed] DB ya poblada (${count} users). Saltando seed.`);
    }
  } catch (err) {
    console.error('[check-and-seed] Error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
