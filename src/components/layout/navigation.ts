import {
  BellRing,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  ListChecks,
  Mail,
  Settings2,
  Tags,
  Users2,
} from "lucide-react";

import type { Role } from "@/generated/prisma/client";

export const appNavigation = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Interventions",
    href: "/interventions",
    icon: ClipboardList,
  },
  {
    title: "Achats",
    href: "/achats",
    icon: Boxes,
  },
  {
    title: "Utilisateurs",
    href: "/admin/users",
    icon: Users2,
    roles: ["admin"] satisfies Role[],
  },
  {
    title: "Services",
    href: "/admin/services",
    icon: Settings2,
    roles: ["admin"] satisfies Role[],
  },
  {
    title: "Categories",
    href: "/admin/categories",
    icon: Tags,
    roles: ["admin"] satisfies Role[],
  },
  {
    title: "Statuts",
    href: "/admin/statuses",
    icon: ListChecks,
    roles: ["admin"] satisfies Role[],
  },
  {
    title: "Notifications",
    href: "/admin/notifications",
    icon: Mail,
    roles: ["admin"] satisfies Role[],
  },
] as const;

export function getNavigationForRole(role: Role) {
  return appNavigation.filter((item) => !("roles" in item) || item.roles.includes(role));
}

export const topbarHighlights = [
  { label: "Urgences", value: "3" },
  { label: "Achats", value: "5" },
  { label: "Alertes", value: "2", icon: BellRing },
] as const;
