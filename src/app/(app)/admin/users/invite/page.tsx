import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { InviteUserForm } from "@/components/admin/invite-user-form";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/client";

const roles: Role[] = [
  "admin",
  "elu",
  "responsable_service",
  "agent",
  "lecture",
];

export default async function InviteUserPage() {
  const session = await auth();

  if (session?.user.role !== "admin") {
    redirect("/dashboard");
  }

  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
    },
  });

  return (
    <PageShell
      eyebrow="Administration"
      title="Inviter un utilisateur"
      description="Creation controlee des comptes utilisateurs par invitation email."
    >
      <Card>
        <CardHeader>
          <CardTitle>Nouvelle invitation</CardTitle>
        </CardHeader>
        <CardContent>
          <InviteUserForm roles={roles} services={services} />
        </CardContent>
      </Card>
    </PageShell>
  );
}
