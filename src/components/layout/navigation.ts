import {
  Boxes,
  ClipboardList,
  LayoutDashboard,
  ListChecks,
  Mail,
  Settings2,
  Tags,
  Users2,
} from "lucide-react";
import type { ComponentType } from "react";

import type { Role } from "@/generated/prisma/client";

type NavigationItem = {
  title: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  roles?: Role[];
};

export const appNavigation: NavigationItem[] = [
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
    roles: ["admin"],
  },
  {
    title: "Services",
    href: "/admin/services",
    icon: Settings2,
    roles: ["admin"],
  },
  {
    title: "Categories",
    href: "/admin/categories",
    icon: Tags,
    roles: ["admin"],
  },
  {
    title: "Statuts",
    href: "/admin/statuses",
    icon: ListChecks,
    roles: ["admin"],
  },
  {
    title: "Notifications",
    href: "/admin/notifications",
    icon: Mail,
    roles: ["admin"],
  },
] as const;

export function getNavigationForRole(role: Role) {
  return appNavigation.filter((item) => !item.roles || item.roles.includes(role));
}
