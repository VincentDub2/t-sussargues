import { hashPassword } from "../src/lib/password";
import { Role, UserStatus } from "../src/generated/prisma/client";
import { createPrismaClient } from "../src/lib/prisma";

const prisma = createPrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@t-sussargues.local";
  const adminUsername =
    process.env.ADMIN_USERNAME ?? adminEmail.split("@")[0] ?? "admin";
  const adminFirstName = process.env.ADMIN_FIRST_NAME ?? "Admin";
  const adminLastName = process.env.ADMIN_LAST_NAME ?? "T-Sussargues";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin1234!";
  const serviceName = "Administration";
  const adminPasswordHash = await hashPassword(adminPassword);
  const defaultCategories = [
    {
      name: "Batiment",
      description: "Demandes liees aux batiments et locaux municipaux.",
      displayOrder: 10,
    },
    {
      name: "Electricite",
      description: "Signalements electriques et depannages associes.",
      displayOrder: 20,
    },
    {
      name: "Voirie",
      description: "Travaux, degradations et interventions sur l'espace public.",
      displayOrder: 30,
    },
  ];
  const defaultStatuses = [
    {
      name: "Nouveau",
      description: "Ticket cree en attente de prise en charge.",
      color: "#1E4FA3",
      isFinal: false,
      displayOrder: 10,
    },
    {
      name: "En cours",
      description: "Intervention en cours de traitement.",
      color: "#F2C94C",
      isFinal: false,
      displayOrder: 20,
    },
    {
      name: "Cloture",
      description: "Intervention terminee et fermee.",
      color: "#2F855A",
      isFinal: true,
      displayOrder: 30,
    },
  ];

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
      username: adminUsername,
      role: Role.admin,
      status: UserStatus.active,
      isActive: true,
      passwordHash: adminPasswordHash,
      serviceId: service.id,
    },
    create: {
      email: adminEmail,
      username: adminUsername,
      firstName: adminFirstName,
      lastName: adminLastName,
      role: Role.admin,
      status: UserStatus.active,
      isActive: true,
      passwordHash: adminPasswordHash,
      serviceId: service.id,
    },
  });

  for (const category of defaultCategories) {
    await prisma.interventionCategory.upsert({
      where: { name: category.name },
      update: {
        description: category.description,
        displayOrder: category.displayOrder,
        isActive: true,
      },
      create: {
        ...category,
        isActive: true,
      },
    });
  }

  for (const status of defaultStatuses) {
    await prisma.interventionStatus.upsert({
      where: { name: status.name },
      update: {
        description: status.description,
        color: status.color,
        isFinal: status.isFinal,
        displayOrder: status.displayOrder,
        isActive: true,
      },
      create: {
        ...status,
        isActive: true,
      },
    });
  }

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
