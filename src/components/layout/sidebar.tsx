"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { appNavigation } from "./navigation";

type AppSidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
};

export function AppSidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
}: AppSidebarProps) {
  const pathname = usePathname();

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
          {appNavigation.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === item.href
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "border-primary-deep bg-primary-deep text-white shadow-sm hover:text-white [&_svg]:text-white"
                    : "border-transparent text-muted hover:border-border hover:bg-card hover:text-foreground",
                  collapsed && "justify-center px-0"
                )}
              >
                <item.icon className="size-4" />
                <span className={cn(collapsed && "hidden")}>{item.title}</span>
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
              {appNavigation.map((item) => {
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === item.href
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onMobileClose}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "border-primary-deep bg-primary-deep text-white shadow-sm hover:text-white [&_svg]:text-white"
                        : "border-transparent text-muted hover:border-border hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
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
