import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";

export default async function PrivateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  if (!session?.user || !session.user.isActive || session.user.status !== "active") {
    redirect("/login");
  }

  return (
    <AppShell
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
