import type { Prisma, Priority, Role } from "@/generated/prisma/client";

type SessionUserLike = {
  id: string;
  role: Role;
  serviceId: string | null;
};

type InterventionAccessTarget = {
  requesterId: string;
  assignedToId: string | null;
  serviceId: string | null;
};

const MANAGER_ROLES: Role[] = ["admin", "responsable_service"];
const PRIORITIES: Priority[] = ["basse", "normale", "haute", "urgente"];

export function getInterventionVisibilityWhere(
  user: SessionUserLike
): Prisma.InterventionWhereInput {
  if (user.role === "admin") {
    return {};
  }

  const orConditions: Prisma.InterventionWhereInput[] = [
    { requesterId: user.id },
    { assignedToId: user.id },
  ];

  if (user.serviceId) {
    orConditions.push({ serviceId: user.serviceId });
  }

  return { OR: orConditions };
}

export function canManageInterventionWorkflow(
  user: SessionUserLike,
  interventionServiceId: string | null
) {
  if (user.role === "admin") {
    return true;
  }

  return (
    user.role === "responsable_service" &&
    Boolean(user.serviceId) &&
    Boolean(interventionServiceId) &&
    user.serviceId === interventionServiceId
  );
}

export function canEditIntervention(
  user: SessionUserLike,
  intervention: InterventionAccessTarget
) {
  if (user.role === "admin") {
    return true;
  }

  if (user.id === intervention.requesterId || user.id === intervention.assignedToId) {
    return true;
  }

  return (
    user.role === "responsable_service" &&
    Boolean(user.serviceId) &&
    user.serviceId === intervention.serviceId
  );
}

export function parsePriorityValue(value: FormDataEntryValue | null): Priority | null {
  return isPriority(value) ? value : null;
}

export function isPriority(value: unknown): value is Priority {
  return typeof value === "string" && PRIORITIES.includes(value as Priority);
}

export function isInterventionManagerRole(role: Role) {
  return MANAGER_ROLES.includes(role);
}
