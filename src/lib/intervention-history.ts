import type {
  InterventionHistoryAction,
  Prisma,
  Priority,
} from "@/generated/prisma/client";
import { PRIORITY_LABELS } from "@/lib/labels";

type HistoryClient = Prisma.TransactionClient;

export const INTERVENTION_HISTORY_ACTION_LABELS: Record<
  InterventionHistoryAction,
  string
> = {
  creation: "Creation",
  modification: "Modification",
  statut: "Statut",
  affectation: "Affectation",
};

export async function createInterventionHistoryEntry(
  tx: HistoryClient,
  {
    interventionId,
    actorId,
    action,
    message,
  }: {
    interventionId: string;
    actorId?: string | null;
    action: InterventionHistoryAction;
    message: string;
  }
) {
  return tx.interventionHistory.create({
    data: {
      interventionId,
      actorId: actorId ?? null,
      action,
      message,
    },
  });
}

export function formatUserDisplayName(user: {
  firstName: string;
  lastName: string;
} | null) {
  if (!user) {
    return "Systeme";
  }

  return `${user.firstName} ${user.lastName}`.trim();
}

export function formatNullableLabel(value: string | null, fallback = "Aucun") {
  return value ?? fallback;
}

export function formatPriorityLabel(priority: Priority) {
  return PRIORITY_LABELS[priority];
}
