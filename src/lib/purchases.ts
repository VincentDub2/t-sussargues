import { randomBytes } from "node:crypto";

import type { Prisma, Priority, PurchaseStatus, Role } from "@/generated/prisma/client";

type SessionUserLike = {
  id: string;
  role: Role;
  serviceId: string | null;
};

type PurchaseAccessTarget = {
  requesterId: string;
  serviceId: string | null;
  status: PurchaseStatus;
};

const MANAGER_ROLES: Role[] = ["admin", "responsable_service"];
const PRIORITIES: Priority[] = ["basse", "normale", "haute", "urgente"];
const PURCHASE_STATUSES: PurchaseStatus[] = [
  "brouillon",
  "soumise",
  "en_validation",
  "informations_demandees",
  "validee",
  "refusee",
  "en_commande",
  "receptionnee",
  "cloturee",
];

export function getPurchaseVisibilityWhere(
  user: SessionUserLike
): Prisma.PurchaseRequestWhereInput {
  if (user.role === "admin") {
    return {};
  }

  const orConditions: Prisma.PurchaseRequestWhereInput[] = [{ requesterId: user.id }];

  if (user.role === "responsable_service" && user.serviceId) {
    orConditions.push({ serviceId: user.serviceId });
  }

  return { OR: orConditions };
}

export function canManagePurchaseWorkflow(
  user: SessionUserLike,
  purchaseServiceId: string | null
) {
  if (user.role === "admin") {
    return true;
  }

  return (
    user.role === "responsable_service" &&
    Boolean(user.serviceId) &&
    Boolean(purchaseServiceId) &&
    user.serviceId === purchaseServiceId
  );
}

export function canEditPurchaseDraft(
  user: SessionUserLike,
  purchase: PurchaseAccessTarget
) {
  const editableStatuses: PurchaseStatus[] = ["brouillon", "informations_demandees"];

  if (user.role === "admin") {
    return editableStatuses.includes(purchase.status);
  }

  return user.id === purchase.requesterId && editableStatuses.includes(purchase.status);
}

export function generatePurchaseRequestNumber(date = new Date()) {
  return `ACH-${date.getFullYear()}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export function parsePriorityValue(value: FormDataEntryValue | null): Priority | null {
  return isPriority(value) ? value : null;
}

export function parsePurchaseStatusValue(
  value: FormDataEntryValue | null
): PurchaseStatus | null {
  return isPurchaseStatus(value) ? value : null;
}

export function isPriority(value: unknown): value is Priority {
  return typeof value === "string" && PRIORITIES.includes(value as Priority);
}

export function isPurchaseStatus(value: unknown): value is PurchaseStatus {
  return (
    typeof value === "string" &&
    PURCHASE_STATUSES.includes(value as PurchaseStatus)
  );
}

export function isPurchaseManagerRole(role: Role) {
  return MANAGER_ROLES.includes(role);
}

export function getPurchaseWorkflowTargets(currentStatus: PurchaseStatus) {
  switch (currentStatus) {
    case "soumise":
      return ["validee", "refusee", "informations_demandees"] as const;
    case "validee":
    case "refusee":
      return ["cloturee"] as const;
    default:
      return [] as const;
  }
}

export function isPurchaseClosed(status: PurchaseStatus) {
  return status === "cloturee";
}
