import { PrismaClient } from '@prisma/client';
import { hashSync } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.DEFAULT_USER_EMAIL ?? 'admin@example.com';
  const name = process.env.DEFAULT_USER_NAME ?? 'Default User';
  const password = process.env.DEFAULT_USER_PASSWORD ?? 'changeme';
  const hashedPassword = hashSync(password, 10);

  await prisma.user.upsert({
    where: { id: 1 },
    update: {
      email,
      name,
      password: hashedPassword,
    },
    create: {
      id: 1,
      email,
      name,
      password: hashedPassword,
    },
  });
}

main()
  .catch((error) => {
    console.error('Failed to seed default user', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
