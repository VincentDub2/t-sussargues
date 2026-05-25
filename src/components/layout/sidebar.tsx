"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { startTransition, type MouseEvent, useOptimistic } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import type { Role } from "@/generated/prisma/client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { getNavigationForRole } from "./navigation";

type AppSidebarProps = {
  role: Role;
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
};

export function AppSidebar({
  role,
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
}: AppSidebarProps) {
  const pathname = usePathname();
  const [optimisticPathname, setOptimisticPathname] = useOptimistic(pathname);
  const navigation = getNavigationForRole(role);
  const activePathname = optimisticPathname;

  const updateOptimisticPathname = (
    event: MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }

    startTransition(() => {
      setOptimisticPathname(href);
    });
  };

  return (
    <>
      <aside
        className={cn(
          "hidden border-r border-border bg-secondary md:flex md:min-h-screen md:flex-col",
          collapsed ? "md:w-20" : "md:w-72"
        )}
      >
        <div className="flex items-center justify-between px-4 py-5">
          <div className={cn("overflow-hidden", collapsed && "sr-only")}>
            <p className="text-xs uppercase tracking-[0.24em] text-muted">
              T-Sussargues
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              Interface interne
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted"
            onClick={onToggle}
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </Button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 pb-4">
          {navigation.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? activePathname === item.href
                : activePathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(event) => updateOptimisticPathname(event, item.href)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors",
                  isActive
                    ? "border-primary-deep bg-primary-deep text-white shadow-sm hover:text-white [&_svg]:text-white"
                    : "border-transparent text-muted hover:border-border hover:bg-card hover:text-foreground",
                  collapsed && "justify-center px-0"
                )}
              >
                <item.icon className="size-4" />
                <span
                  className={cn(
                    "font-semibold",
                    isActive && "font-bold text-white",
                    collapsed && "hidden"
                  )}
                >
                  {item.title}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <button
            type="button"
            className="flex-1 bg-[var(--overlay)]"
            aria-label="Fermer la navigation"
            onClick={onMobileClose}
          />
          <aside className="w-72 border-l border-border bg-card p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted">
                  Navigation
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  T-Sussargues
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={onMobileClose}>
                <PanelLeftClose />
              </Button>
            </div>

            <nav className="flex flex-col gap-1">
              {navigation.map((item) => {
                const isActive =
                  item.href === "/dashboard"
                    ? activePathname === item.href
                    : activePathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={(event) => {
                      updateOptimisticPathname(event, item.href);
                      onMobileClose();
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors",
                      isActive
                        ? "border-primary-deep bg-primary-deep text-white shadow-sm hover:text-white [&_svg]:text-white"
                        : "border-transparent text-muted hover:border-border hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <item.icon className="size-4" />
                    <span className={cn("font-semibold", isActive && "font-bold text-white")}>
                      {item.title}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}
