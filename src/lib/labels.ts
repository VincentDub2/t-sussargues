import type {
  Priority,
  PurchaseStatus,
  Role,
  UserStatus,
} from "@/generated/prisma/client";

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

export const PRIORITY_LABELS: Record<Priority, string> = {
  basse: "Basse",
  normale: "Normale",
  haute: "Haute",
  urgente: "Urgente",
};

export const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  brouillon: "Brouillon",
  soumise: "Soumise",
  en_validation: "En validation",
  informations_demandees: "Informations demandees",
  validee: "Validee",
  refusee: "Refusee",
  en_commande: "En commande",
  receptionnee: "Receptionnee",
  cloturee: "Cloturee",
};
