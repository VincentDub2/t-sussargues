import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { auth, signOut } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";

const SIDEBAR_COLLAPSED_COOKIE = "t-sussargues-sidebar-collapsed";

export default async function PrivateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);

  if (!session?.user || !session.user.isActive || session.user.status !== "active") {
    redirect("/login");
  }

  const initialCollapsed =
    cookieStore.get(SIDEBAR_COLLAPSED_COOKIE)?.value === "true";

  return (
    <AppShell
      initialCollapsed={initialCollapsed}
      user={{
        name: session.user.name ?? `${session.user.firstName} ${session.user.lastName}`,
        role: session.user.role,
        initials: `${session.user.firstName[0] ?? ""}${session.user.lastName[0] ?? ""}`,
      }}
      onSignOut={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
    >
      {children}
    </AppShell>
  );
}
