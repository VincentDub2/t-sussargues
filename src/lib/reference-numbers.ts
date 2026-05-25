import type { Prisma } from "@/generated/prisma/client";

type ReferenceScope = "intervention" | "purchase" | `purchase_document:${string}`;

type ReferenceNumberInput = {
  scope: ReferenceScope;
  prefix: string;
  date?: Date;
  padding?: number;
};

function formatSequence(value: number, padding: number) {
  return String(value).padStart(padding, "0");
}

export async function getNextReferenceNumber(
  tx: Prisma.TransactionClient,
  { scope, prefix, date = new Date(), padding = 4 }: ReferenceNumberInput
) {
  const year = date.getFullYear();
  const nextValue = await getNextSequenceValue(tx, scope, year);

  return `${prefix}-${year}-${formatSequence(nextValue, padding)}`;
}

export async function getNextPurchaseDocumentReference(
  tx: Prisma.TransactionClient,
  {
    purchaseId,
    requestNumber,
  }: {
    purchaseId: string;
    requestNumber: string;
  }
) {
  const nextValue = await getNextSequenceValue(
    tx,
    `purchase_document:${purchaseId}`,
    new Date().getFullYear()
  );

  return `${requestNumber}-DOC-${formatSequence(nextValue, 3)}`;
}

async function getNextSequenceValue(
  tx: Prisma.TransactionClient,
  scope: ReferenceScope,
  year: number
) {
  await tx.referenceSequence.createMany({
    data: {
      scope,
      year,
      nextValue: 1,
    },
    skipDuplicates: true,
  });

  const updated = await tx.referenceSequence.update({
    where: {
      scope_year: {
        scope,
        year,
      },
    },
    data: {
      nextValue: {
        increment: 1,
      },
    },
    select: {
      nextValue: true,
    },
  });

  return updated.nextValue - 1;
}
