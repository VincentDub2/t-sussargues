"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Menu, Search } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { appNavigation, topbarHighlights } from "./navigation";

const pageMeta: Record<string, { title: string; description: string }> = {
  "/dashboard": {
    title: "Dashboard",
    description: "Vue d'ensemble de l'activite et des flux a traiter.",
  },
  "/interventions": {
    title: "Interventions",
    description: "Espace liste et priorisation des interventions techniques.",
  },
  "/achats": {
    title: "Achats",
    description: "Suivi des demandes d'achat et des prochaines validations.",
  },
  "/admin/users": {
    title: "Utilisateurs",
    description: "Base administrative pour l'administration des comptes.",
  },
};

type AppTopbarProps = {
  onOpenMobileNav: () => void;
};

export function AppTopbar({ onOpenMobileNav }: AppTopbarProps) {
  const pathname = usePathname();
  const meta = pageMeta[pathname] ?? pageMeta["/dashboard"];
  const currentPage = appNavigation.find((item) => item.href === pathname);

  return (
    <header className="border-b border-border bg-background">
      <div className="flex flex-col gap-4 px-5 py-4 lg:px-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="md:hidden"
              onClick={onOpenMobileNav}
            >
              <Menu />
            </Button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted">
                <Link href="/dashboard">Application</Link>
                <ChevronRight className="size-3" />
                <span>{currentPage?.title ?? "Navigation"}</span>
              </div>
              <h1 className="mt-2 text-2xl font-semibold text-foreground">
                {meta.title}
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
                {meta.description}
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-3 sm:flex">
            <div className="hidden w-56 lg:block">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <Input
                  aria-label="Recherche"
                  placeholder="Recherche rapide"
                  className="pl-9"
                />
              </div>
            </div>
            <Avatar>TS</Avatar>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {topbarHighlights.map((item) => (
            <Badge key={item.label} variant="outline" className="gap-2 px-3 py-1.5">
              {"icon" in item && item.icon ? <item.icon className="size-3.5" /> : null}
              <span>{item.label}</span>
              <span className="font-semibold text-foreground">
                {item.value}
              </span>
            </Badge>
          ))}
        </div>
      </div>
    </header>
  );
}
