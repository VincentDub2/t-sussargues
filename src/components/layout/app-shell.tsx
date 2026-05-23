"use client";

import { useState } from "react";

import type { Role } from "@/generated/prisma/client";

import { AppSidebar } from "./sidebar";
import { AppTopbar } from "./topbar";

type AppShellProps = {
  children: React.ReactNode;
  user: {
    name: string;
    role: Role;
    initials: string;
  };
  onSignOut: () => Promise<void>;
};

export function AppShell({ children, user, onSignOut }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <AppSidebar
          role={user.role}
          collapsed={collapsed}
          onToggle={() => setCollapsed((value) => !value)}
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
