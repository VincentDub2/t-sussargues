import type { Prisma, PurchaseRequestHistoryAction } from "@/generated/prisma/client";

type HistoryClient = Prisma.TransactionClient;

export const PURCHASE_HISTORY_ACTION_LABELS: Record<
  PurchaseRequestHistoryAction,
  string
> = {
  creation: "Creation",
  modification: "Modification",
  soumission: "Soumission",
  validation: "Validation",
  refus: "Refus",
  informations_complementaires: "Informations complementaires",
  cloture: "Cloture",
};

export async function createPurchaseHistoryEntry(
  tx: HistoryClient,
  {
    purchaseRequestId,
    actorId,
    action,
    message,
  }: {
    purchaseRequestId: string;
    actorId?: string | null;
    action: PurchaseRequestHistoryAction;
    message: string;
  }
) {
  return tx.purchaseRequestHistory.create({
    data: {
      purchaseRequestId,
      actorId: actorId ?? null,
      action,
      message,
    },
  });
}

export function formatPurchaseActorDisplayName(user: {
  firstName: string;
  lastName: string;
} | null) {
  if (!user) {
    return "Systeme";
  }

  return `${user.firstName} ${user.lastName}`.trim();
}
