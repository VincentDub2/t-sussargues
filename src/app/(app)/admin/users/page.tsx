import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { UsersDataTable } from "@/components/admin/users-data-table";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_LABELS } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

function getInvitationState(invitation: {
  acceptedAt: Date | null;
  cancelledAt: Date | null;
  expiresAt: Date;
}) {
  if (invitation.acceptedAt) {
    return "Acceptee";
  }

  if (invitation.cancelledAt) {
    return "Annulee";
  }

  if (invitation.expiresAt < new Date()) {
    return "Expiree";
  }

  return "En attente";
}

export default async function AdminUsersPage() {
  const session = await auth();

  if (session?.user.role !== "admin") {
    redirect("/dashboard");
  }

  const [users, services, invitations, invitationLogs] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        service: true,
      },
    }),
    prisma.service.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    }),
    prisma.userInvitation.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        service: true,
      },
    }),
    prisma.notificationLog.findMany({
      where: {
        event: "user_invitation",
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <PageShell
      eyebrow="Administration"
      title="Utilisateurs"
      description="Point d'entree pour la gestion des comptes, des roles et des invitations."
    >
      <div className="flex flex-wrap justify-end gap-3">
        <Link
          href="/admin/services"
          className={buttonVariants({ variant: "outline", className: "w-full sm:w-auto" })}
        >
          Gerer les services
        </Link>
        <Link
          href="/admin/users/invite"
          className={buttonVariants({
            className: "w-full sm:w-auto text-primary-foreground hover:text-primary-foreground",
          })}
        >
          Inviter un utilisateur
        </Link>
      </div>

      <section className="grid gap-4 2xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.9fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Annuaire interne</CardTitle>
          </CardHeader>
          <CardContent>
            <UsersDataTable
              currentUserId={session.user.id}
              services={services}
              users={users.map((user) => ({
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                status: user.status,
                isActive: user.isActive,
                serviceId: user.serviceId,
                serviceName: user.service?.name ?? null,
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invitations recentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {invitations.length > 0 ? (
              invitations.map((invitation) => (
                <div key={invitation.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">
                      {invitation.firstName} {invitation.lastName}
                    </p>
                    <Badge variant="outline">{getInvitationState(invitation)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">{invitation.email}</p>
                  <p className="mt-1 text-sm text-muted">
                    {ROLE_LABELS[invitation.role]}
                    {invitation.service ? ` · ${invitation.service.name}` : ""}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">Aucune invitation pour le moment.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Logs d&apos;invitation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {invitationLogs.length > 0 ? (
            invitationLogs.map((log) => (
              <div key={log.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{log.recipient}</p>
                  <Badge variant="outline">{log.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted">{log.subject}</p>
                <p className="mt-1 text-xs text-muted">
                  {log.createdAt.toLocaleString("fr-FR")}
                </p>
                {log.errorMessage ? (
                  <div className="mt-3 rounded border border-border bg-secondary px-3 py-2 font-mono text-xs text-foreground">
                    {log.errorMessage}
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted">Aucun log d&apos;invitation pour le moment.</p>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
