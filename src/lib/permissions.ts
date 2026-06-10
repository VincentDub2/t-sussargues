import type { Role } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

export const ROLES: Role[] = [
  "admin",
  "elu",
  "responsable_service",
  "agent",
  "lecture",
];

export const PERMISSION_GROUPS = [
  {
    label: "Socle",
    description: "Acces aux ecrans communs de l'application.",
    permissions: [
      {
        key: "dashboard.view",
        label: "Voir le dashboard",
        description: "Acceder a la synthese des demandes visibles.",
      },
    ],
  },
  {
    label: "Achats",
    description: "Creation, consultation et validation des demandes d'achat.",
    permissions: [
      {
        key: "purchase.create",
        label: "Creer un achat",
        description: "Ouvrir une nouvelle demande d'achat.",
      },
      {
        key: "purchase.view_all",
        label: "Voir tous les achats",
        description: "Voir toutes les demandes, pas seulement son perimetre.",
      },
      {
        key: "purchase.choose_service",
        label: "Choisir le service achat",
        description: "Creer ou modifier une demande pour un autre service.",
      },
      {
        key: "purchase.validate",
        label: "Valider les achats",
        description: "Valider, refuser, demander des informations ou cloturer.",
      },
      {
        key: "purchase.documents",
        label: "Gerer les justificatifs",
        description: "Ajouter ou supprimer les pieces rattachees.",
      },
    ],
  },
  {
    label: "Interventions",
    description: "Suivi et pilotage des interventions techniques.",
    permissions: [
      {
        key: "intervention.create",
        label: "Creer une intervention",
        description: "Ouvrir un ticket d'intervention.",
      },
      {
        key: "intervention.view_all",
        label: "Voir toutes les interventions",
        description: "Voir tous les tickets, hors limite service/demandeur.",
      },
      {
        key: "intervention.manage",
        label: "Piloter les interventions",
        description: "Assigner, changer le statut et modifier le suivi.",
      },
    ],
  },
  {
    label: "Administration",
    description: "Acces aux reglages sensibles.",
    permissions: [
      {
        key: "admin.users",
        label: "Gerer les utilisateurs",
        description: "Inviter, creer, modifier et desactiver les comptes.",
      },
      {
        key: "admin.roles",
        label: "Gerer les droits",
        description: "Modifier la matrice des roles et permissions.",
      },
      {
        key: "admin.services",
        label: "Gerer les services",
        description: "Creer ou modifier les services.",
      },
      {
        key: "admin.taxonomy",
        label: "Gerer categories/statuts",
        description: "Administrer les listes de reference.",
      },
      {
        key: "admin.locations",
        label: "Gerer les lieux",
        description: "Administrer les lieux d'intervention.",
      },
      {
        key: "admin.notifications",
        label: "Gerer les notifications",
        description: "Modifier les modeles et destinataires email.",
      },
    ],
  },
] as const;

export type PermissionKey =
  (typeof PERMISSION_GROUPS)[number]["permissions"][number]["key"];

export type PermissionDefinition = {
  key: PermissionKey;
  label: string;
  description: string;
};

export type RolePermissionMatrix = Record<Role, Record<PermissionKey, boolean>>;
export type PermissionSet = Record<PermissionKey, boolean>;

const DEFAULT_ROLE_PERMISSIONS: Record<Role, readonly PermissionKey[]> = {
  admin: [
    "dashboard.view",
    "purchase.create",
    "purchase.view_all",
    "purchase.choose_service",
    "purchase.validate",
    "purchase.documents",
    "intervention.create",
    "intervention.view_all",
    "intervention.manage",
    "admin.users",
    "admin.roles",
    "admin.services",
    "admin.taxonomy",
    "admin.locations",
    "admin.notifications",
  ],
  elu: [
    "dashboard.view",
    "purchase.create",
    "purchase.view_all",
    "purchase.validate",
    "purchase.documents",
    "intervention.create",
    "intervention.view_all",
  ],
  responsable_service: [
    "dashboard.view",
    "purchase.create",
    "purchase.choose_service",
    "purchase.validate",
    "purchase.documents",
    "intervention.create",
    "intervention.manage",
  ],
  agent: ["dashboard.view", "purchase.create", "intervention.create"],
  lecture: ["dashboard.view"],
};

export const PERMISSION_KEYS = PERMISSION_GROUPS.flatMap((group) =>
  group.permissions.map((permission) => permission.key)
);

const permissionKeySet = new Set<PermissionKey>(PERMISSION_KEYS);

export function isPermissionKey(value: unknown): value is PermissionKey {
  return typeof value === "string" && permissionKeySet.has(value as PermissionKey);
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && ROLES.includes(value as Role);
}

export function canRoleByDefault(role: Role, permission: PermissionKey) {
  return DEFAULT_ROLE_PERMISSIONS[role].includes(permission);
}

function createDefaultMatrix(): RolePermissionMatrix {
  return Object.fromEntries(
    ROLES.map((role) => [
      role,
      Object.fromEntries(
        PERMISSION_KEYS.map((permission) => [
          permission,
          canRoleByDefault(role, permission),
        ])
      ),
    ])
  ) as RolePermissionMatrix;
}

export async function getRolePermissionMatrix(): Promise<RolePermissionMatrix> {
  const matrix = createDefaultMatrix();
  const overrides = await prisma.rolePermission.findMany({
    where: {
      permission: {
        in: [...PERMISSION_KEYS],
      },
    },
    select: {
      role: true,
      permission: true,
      enabled: true,
    },
  });

  for (const override of overrides) {
    if (isPermissionKey(override.permission)) {
      matrix[override.role][override.permission] = override.enabled;
    }
  }

  return matrix;
}

export async function getRolePermissions(role: Role): Promise<PermissionSet> {
  const matrix = await getRolePermissionMatrix();

  return matrix[role];
}

export async function roleHasPermission(role: Role, permission: PermissionKey) {
  const override = await prisma.rolePermission.findUnique({
    where: {
      role_permission: {
        role,
        permission,
      },
    },
    select: {
      enabled: true,
    },
  });

  return override?.enabled ?? canRoleByDefault(role, permission);
}

export async function setRolePermission({
  role,
  permission,
  enabled,
}: {
  role: Role;
  permission: PermissionKey;
  enabled: boolean;
}) {
  await prisma.rolePermission.upsert({
    where: {
      role_permission: {
        role,
        permission,
      },
    },
    update: {
      enabled,
    },
    create: {
      role,
      permission,
      enabled,
    },
  });
}
