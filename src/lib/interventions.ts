import type { Prisma, Priority, Role } from "@/generated/prisma/client";
import { canRoleByDefault, type PermissionKey, type PermissionSet } from "@/lib/permissions";

type SessionUserLike = {
  id: string;
  role: Role;
  serviceId: string | null;
  permissions?: PermissionSet;
};

type InterventionAccessTarget = {
  requesterId: string;
  assignedToId: string | null;
  serviceId: string | null;
};

const MANAGER_ROLES: Role[] = ["admin", "responsable_service"];
const PRIORITIES: Priority[] = ["basse", "normale", "haute", "urgente"];

function hasInterventionPermission(
  user: SessionUserLike,
  permission: PermissionKey
) {
  return user.permissions?.[permission] ?? canRoleByDefault(user.role, permission);
}

export function getInterventionVisibilityWhere(
  user: SessionUserLike
): Prisma.InterventionWhereInput {
  if (hasInterventionPermission(user, "intervention.view_all")) {
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
  if (!hasInterventionPermission(user, "intervention.manage")) {
    return false;
  }

  if (hasInterventionPermission(user, "intervention.view_all")) {
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
  if (
    hasInterventionPermission(user, "intervention.manage") &&
    hasInterventionPermission(user, "intervention.view_all")
  ) {
    return true;
  }

  if (user.id === intervention.requesterId || user.id === intervention.assignedToId) {
    return true;
  }

  return (
    hasInterventionPermission(user, "intervention.manage") &&
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
