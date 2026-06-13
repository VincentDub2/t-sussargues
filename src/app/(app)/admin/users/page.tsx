import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { auth } from "@/auth";
import { RecentInvitationsList } from "@/components/admin/invitations-table";
import { InviteUserDialog } from "@/components/admin/invite-user-dialog";
import { UsersDataTable } from "@/components/admin/users-data-table";
import { PageShell } from "@/components/layout/page-shell";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const RECENT_INVITATIONS_LIMIT = 5;

const invitationRoles: Role[] = [
  "admin",
  "elu",
  "responsable_service",
  "agent",
  "lecture",
];

export default async function AdminUsersPage() {
  const session = await auth();

  if (session?.user.role !== "admin") {
    redirect("/dashboard");
  }

  const now = new Date();
  const [users, services, invitations] = await Promise.all([
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
      take: RECENT_INVITATIONS_LIMIT,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        service: {
          select: {
            name: true,
          },
        },
        expiresAt: true,
        acceptedAt: true,
        cancelledAt: true,
        createdAt: true,
      },
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
        <InviteUserDialog
          roles={invitationRoles}
          services={services.filter((service) => service.isActive)}
        />
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
                username: user.username,
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
          <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <CardTitle>Invitations recentes</CardTitle>
              <CardDescription>
                Les {RECENT_INVITATIONS_LIMIT} dernieres invitations envoyees.
              </CardDescription>
            </div>
            <Link
              href="/admin/users/invitations"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Voir plus
              <ArrowRight />
            </Link>
          </CardHeader>
          <CardContent>
            <RecentInvitationsList invitations={invitations} now={now} />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <CardTitle>Diagnostic email</CardTitle>
            <CardDescription>
              Les invitations recentes affichent le suivi metier. Les logs techniques d&apos;envoi sont consultables separement.
            </CardDescription>
          </div>
          <Link
            href="/admin/users/logs"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Voir tous les logs
          </Link>
        </CardHeader>
        <CardContent className="text-sm leading-6 text-muted">
          Consultez cette page uniquement pour verifier les envois SMTP, les previsualisations et les erreurs de livraison des emails d&apos;invitation.
        </CardContent>
      </Card>
    </PageShell>
  );
}
