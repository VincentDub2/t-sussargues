import type { Role, UserStatus } from "@/generated/prisma/client";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrateur",
  elu: "Elu",
  responsable_service: "Responsable service",
  agent: "Agent",
  lecture: "Lecture",
};

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  invited: "Invitation envoyee",
  active: "Actif",
  disabled: "Desactive",
};
