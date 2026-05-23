import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { CreateInterventionForm } from "@/components/interventions/create-intervention-form";
import { InterventionsDataTable } from "@/components/interventions/interventions-data-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getInterventionVisibilityWhere, isInterventionManagerRole } from "@/lib/interventions";
import { prisma } from "@/lib/prisma";

export default async function InterventionsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const [interventions, statuses, categories, services, assignedCount] = await Promise.all([
    prisma.intervention.findMany({
      where: getInterventionVisibilityWhere({
        id: session.user.id,
        role: session.user.role,
        serviceId: session.user.serviceId,
      }),
      orderBy: [{ createdAt: "desc" }],
      include: {
        status: true,
        category: true,
        service: true,
        requester: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        assignedTo: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
    prisma.interventionStatus.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.interventionCategory.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.service.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.intervention.count({
      where: {
        assignedToId: session.user.id,
        closedAt: null,
      },
    }),
  ]);

  const hasActiveStatus = statuses.length > 0;
  const managerAccess = isInterventionManagerRole(session.user.role);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.9fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader>
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Module metier</p>
            <CardTitle className="text-2xl">Interventions</CardTitle>
            <CardDescription>
              Ouverture, suivi et pilotage des tickets techniques avec affectation et priorites.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-secondary p-4">
              <p className="text-sm text-muted">Interventions visibles</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{interventions.length}</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary p-4">
              <p className="text-sm text-muted">Assignees a moi</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{assignedCount}</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary p-4">
              <p className="text-sm text-muted">Capacite de pilotage</p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {managerAccess ? "Admin / responsable" : "Suivi standard"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Créer un ticket</CardTitle>
            <CardDescription>
              Toute personne connectee peut signaler une intervention et suivre son traitement.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateInterventionForm
              categories={categories}
              services={services}
              hasActiveStatus={hasActiveStatus}
            />
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle>Liste des interventions</CardTitle>
              <CardDescription>
                Suivi des tickets visibles selon votre role et votre service.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <InterventionsDataTable
              interventions={interventions.map((intervention) => ({
                id: intervention.id,
                ticketNumber: intervention.ticketNumber,
                title: intervention.title,
                description: intervention.description,
                location: intervention.location,
                createdAt: intervention.createdAt.toISOString(),
                updatedAt: intervention.updatedAt.toISOString(),
                closedAt: intervention.closedAt?.toISOString() ?? null,
                priority: intervention.priority,
                statusId: intervention.statusId,
                statusLabel: intervention.status.name,
                statusColor: intervention.status.color,
                requesterName: `${intervention.requester.firstName} ${intervention.requester.lastName}`,
                serviceId: intervention.serviceId,
                serviceName: intervention.service?.name ?? null,
                categoryName: intervention.category?.name ?? null,
                assignedToId: intervention.assignedToId,
                assignedToName: intervention.assignedTo
                  ? `${intervention.assignedTo.firstName} ${intervention.assignedTo.lastName}`
                  : null,
              }))}
              currentUserId={session.user.id}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
