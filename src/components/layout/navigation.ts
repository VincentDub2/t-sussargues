import {
  BellRing,
  Boxes,
  ClipboardList,
  LayoutDashboard,
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
] as const;

export const topbarHighlights = [
  { label: "Urgences", value: "3" },
  { label: "Achats", value: "5" },
  { label: "Alertes", value: "2", icon: BellRing },
] as const;
