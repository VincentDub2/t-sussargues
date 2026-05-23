import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

const requiredDelegates = [
  "user",
  "service",
  "userInvitation",
  "passwordResetToken",
  "interventionCategory",
  "interventionStatus",
  "intervention",
  "interventionHistory",
  "purchaseRequest",
  "purchaseRequestHistory",
  "notificationLog",
  "notificationEvent",
  "notificationTemplate",
  "notificationRecipient",
] as const;

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL is required to initialize Prisma.");
  }

  return url;
}

export function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: getDatabaseUrl() });

  return new PrismaClient({ adapter });
}

function hasCurrentSchemaDelegates(client: ReturnType<typeof createPrismaClient>) {
  return requiredDelegates.every((delegate) => delegate in client);
}

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: ReturnType<typeof createPrismaClient>;
};

const cachedPrisma = globalForPrisma.prisma;

export const prisma =
  cachedPrisma && hasCurrentSchemaDelegates(cachedPrisma)
    ? cachedPrisma
    : createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
