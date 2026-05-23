import { hashPassword } from "../src/lib/password";
import { Role, UserStatus } from "../src/generated/prisma/client";
import { createPrismaClient } from "../src/lib/prisma";

const prisma = createPrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@t-sussargues.local";
  const adminFirstName = process.env.ADMIN_FIRST_NAME ?? "Admin";
  const adminLastName = process.env.ADMIN_LAST_NAME ?? "T-Sussargues";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin1234!";
  const serviceName = "Administration";
  const adminPasswordHash = await hashPassword(adminPassword);

  const service = await prisma.service.upsert({
    where: { name: serviceName },
    update: {},
    create: {
      name: serviceName,
      description: "Service systeme initialise par le seed Prisma.",
      isActive: true,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      firstName: adminFirstName,
      lastName: adminLastName,
      role: Role.admin,
      status: UserStatus.active,
      isActive: true,
      passwordHash: adminPasswordHash,
      serviceId: service.id,
    },
    create: {
      email: adminEmail,
      firstName: adminFirstName,
      lastName: adminLastName,
      role: Role.admin,
      status: UserStatus.active,
      isActive: true,
      passwordHash: adminPasswordHash,
      serviceId: service.id,
    },
  });

  console.log(`Admin ready: ${admin.email}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
