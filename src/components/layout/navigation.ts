import {
  BellRing,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  ListChecks,
  Settings2,
  Tags,
  Users2,
} from "lucide-react";

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
  },
  {
    title: "Services",
    href: "/admin/services",
    icon: Settings2,
  },
  {
    title: "Categories",
    href: "/admin/categories",
    icon: Tags,
  },
  {
    title: "Statuts",
    href: "/admin/statuses",
    icon: ListChecks,
  },
] as const;

export const topbarHighlights = [
  { label: "Urgences", value: "3" },
  { label: "Achats", value: "5" },
  { label: "Alertes", value: "2", icon: BellRing },
] as const;
