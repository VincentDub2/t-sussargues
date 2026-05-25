import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { InterventionDetailsForm } from "@/components/interventions/intervention-details-form";
import { InterventionHistoryList } from "@/components/interventions/intervention-history-list";
import { InterventionStatusBadge } from "@/components/interventions/intervention-status-badge";
import { InterventionWorkflowForm } from "@/components/interventions/intervention-workflow-form";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { canEditIntervention, canManageInterventionWorkflow, getInterventionVisibilityWhere } from "@/lib/interventions";
import { PRIORITY_LABELS } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

type InterventionDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function InterventionDetailPage({
  params,
}: InterventionDetailPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;

  const intervention = await prisma.intervention.findFirst({
    where: {
      id,
      AND: [
        getInterventionVisibilityWhere({
          id: session.user.id,
          role: session.user.role,
          serviceId: session.user.serviceId,
        }),
      ],
    },
    include: {
      status: true,
      category: true,
      service: true,
      requester: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      assignedTo: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  if (!intervention) {
    notFound();
  }

  const [categories, services, statuses, assignees, history, locations] = await Promise.all([
    prisma.interventionCategory.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.service.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.interventionStatus.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      where: {
        isActive: true,
        status: "active",
        role: { in: ["agent", "responsable_service"] },
        ...(intervention.serviceId ? { serviceId: intervention.serviceId } : {}),
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        service: {
          select: { name: true },
        },
      },
    }),
    prisma.interventionHistory.findMany({
      where: { interventionId: intervention.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        action: true,
        message: true,
        createdAt: true,
        actor: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
    prisma.interventionLocation.findMany({
      orderBy: { name: "asc" },
      select: { name: true },
    }),
  ]);

  const canEdit = canEditIntervention(
    {
      id: session.user.id,
      role: session.user.role,
      serviceId: session.user.serviceId,
    },
    {
      requesterId: intervention.requesterId,
      assignedToId: intervention.assignedToId,
      serviceId: intervention.serviceId,
    }
  );

  const canManage = canManageInterventionWorkflow(
    {
      id: session.user.id,
      role: session.user.role,
      serviceId: session.user.serviceId,
    },
    intervention.serviceId
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline">{intervention.ticketNumber}</Badge>
              <Badge variant="outline">{PRIORITY_LABELS[intervention.priority]}</Badge>
              <InterventionStatusBadge
                label={intervention.status.name}
                color={intervention.status.color}
              />
            </div>
            <CardTitle className="text-2xl">{intervention.title}</CardTitle>
            <CardDescription>
              Creee le {intervention.createdAt.toLocaleString("fr-FR")} par{" "}
              {intervention.requester.firstName} {intervention.requester.lastName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg border border-border bg-secondary p-4 text-sm leading-6 text-foreground">
              {intervention.description}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Lieu</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {intervention.location ?? "Non renseigne"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Service</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {intervention.service?.name ?? "Sans service"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Categorie</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {intervention.category?.name ?? "Non renseignee"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Agent assigne</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {intervention.assignedTo
                    ? `${intervention.assignedTo.firstName} ${intervention.assignedTo.lastName}`
                    : "Aucune affectation"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Cloture</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {intervention.closedAt
                    ? intervention.closedAt.toLocaleString("fr-FR")
                    : "Ticket ouvert"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acces rapide</CardTitle>
            <CardDescription>
              Revenez a la liste ou pilotez le ticket selon vos droits.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link
              href="/interventions"
              className={buttonVariants({ variant: "outline", className: "w-full" })}
            >
              Retour a la liste
            </Link>
            <div className="rounded-lg border border-border bg-secondary p-4 text-sm text-muted">
              {canManage
                ? "Vous pouvez affecter, changer le statut et reajuster la priorite de ce ticket."
                : canEdit
                  ? "Vous pouvez mettre a jour le contenu de la fiche et suivre l'avancement."
                  : "Cette fiche est visible en lecture dans votre perimetre actuel."}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Modifier la fiche</CardTitle>
            <CardDescription>
              Mise a jour du contenu, de la categorie et du service lies a l&apos;intervention.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InterventionDetailsForm
              intervention={{
                id: intervention.id,
                title: intervention.title,
                description: intervention.description,
                location: intervention.location,
                categoryId: intervention.categoryId,
                serviceId: intervention.serviceId,
              }}
              categories={categories}
              services={services}
              locations={locations.map((location) => location.name)}
              disabled={!canEdit}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pilotage</CardTitle>
            <CardDescription>
              Reservation admin / responsable pour l&apos;assignation et les changements de statut.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <InterventionWorkflowForm
              intervention={{
                id: intervention.id,
                statusId: intervention.statusId,
                priority: intervention.priority,
                assignedToId: intervention.assignedToId,
              }}
              statuses={statuses}
              assignees={assignees.map((assignee) => ({
                id: assignee.id,
                name: `${assignee.firstName} ${assignee.lastName}`,
                serviceName: assignee.service?.name ?? null,
              }))}
              disabled={!canManage}
            />

            <Separator />

            <div className="grid gap-3 text-sm text-muted">
              <div>
                <p className="font-medium text-foreground">Demandeur</p>
                <p>
                  {intervention.requester.firstName} {intervention.requester.lastName} ·{" "}
                  {intervention.requester.email}
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground">Derniere mise a jour</p>
                <p>{intervention.updatedAt.toLocaleString("fr-FR")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Historique</CardTitle>
          <CardDescription>
            Trace des actions importantes effectuees sur cette intervention.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InterventionHistoryList entries={history} />
        </CardContent>
      </Card>
    </div>
  );
}
