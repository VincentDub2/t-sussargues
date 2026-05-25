"use client";

import { useState } from "react";

import type { Role } from "@/generated/prisma/client";

import { AppSidebar } from "./sidebar";
import { AppTopbar } from "./topbar";

type AppShellProps = {
  children: React.ReactNode;
  initialCollapsed: boolean;
  user: {
    name: string;
    role: Role;
    initials: string;
  };
  onSignOut: () => Promise<void>;
};

const SIDEBAR_COLLAPSED_COOKIE = "t-sussargues-sidebar-collapsed";

export function AppShell({
  children,
  initialCollapsed,
  user,
  onSignOut,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const toggleCollapsed = () => {
    setCollapsed((value) => {
      const nextValue = !value;
      document.cookie = `${SIDEBAR_COLLAPSED_COOKIE}=${String(
        nextValue
      )}; Path=/; Max-Age=31536000; SameSite=Lax`;

      return nextValue;
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <AppSidebar
          role={user.role}
          collapsed={collapsed}
          onToggle={toggleCollapsed}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <AppTopbar
            user={user}
            onOpenMobileNav={() => setMobileOpen(true)}
            onSignOut={onSignOut}
          />
          <main className="flex-1 px-5 py-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
