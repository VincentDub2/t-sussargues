import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { CreateInterventionForm } from "@/components/interventions/create-intervention-form";
import { InterventionStatusBadge } from "@/components/interventions/intervention-status-badge";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import type { Priority, Prisma } from "@/generated/prisma/client";
import { getInterventionVisibilityWhere, isInterventionManagerRole, isPriority } from "@/lib/interventions";
import { PRIORITY_LABELS } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

type InterventionsPageProps = {
  searchParams?: Promise<{
    statusId?: string;
    priority?: string;
    serviceId?: string;
  }>;
};

const priorities: Priority[] = ["basse", "normale", "haute", "urgente"];

function getSingleValue(value: string | undefined) {
  return value?.trim() ? value.trim() : "";
}

export default async function InterventionsPage({
  searchParams,
}: InterventionsPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const params = (await searchParams) ?? {};
  const selectedStatusId = getSingleValue(params.statusId);
  const selectedServiceId = getSingleValue(params.serviceId);
  const selectedPriority = isPriority(params.priority) ? params.priority : "";

  const where: Prisma.InterventionWhereInput = {
    AND: [
      getInterventionVisibilityWhere({
        id: session.user.id,
        role: session.user.role,
        serviceId: session.user.serviceId,
      }),
      selectedStatusId ? { statusId: selectedStatusId } : {},
      selectedPriority ? { priority: selectedPriority } : {},
      selectedServiceId ? { serviceId: selectedServiceId } : {},
    ],
  };

  const [interventions, statuses, categories, services, assignedCount] = await Promise.all([
    prisma.intervention.findMany({
      where,
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

      <section className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Filtres</CardTitle>
            <CardDescription>Affinez la liste par statut, priorite et service.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" method="get">
              <div className="space-y-2">
                <label htmlFor="statusId" className="text-sm font-medium text-foreground">
                  Statut
                </label>
                <SelectField id="statusId" name="statusId" defaultValue={selectedStatusId}>
                  <option value="">Tous les statuts</option>
                  {statuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.name}
                    </option>
                  ))}
                </SelectField>
              </div>

              <div className="space-y-2">
                <label htmlFor="priority" className="text-sm font-medium text-foreground">
                  Priorite
                </label>
                <SelectField id="priority" name="priority" defaultValue={selectedPriority}>
                  <option value="">Toutes les priorites</option>
                  {priorities.map((priority) => (
                    <option key={priority} value={priority}>
                      {PRIORITY_LABELS[priority]}
                    </option>
                  ))}
                </SelectField>
              </div>

              <div className="space-y-2">
                <label htmlFor="serviceId" className="text-sm font-medium text-foreground">
                  Service
                </label>
                <SelectField id="serviceId" name="serviceId" defaultValue={selectedServiceId}>
                  <option value="">Tous les services</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </SelectField>
              </div>

              <div className="flex flex-wrap gap-3">
                <button className={buttonVariants({ className: "w-full sm:w-auto" })} type="submit">
                  Appliquer
                </button>
                <Link
                  href="/interventions"
                  className={buttonVariants({
                    variant: "outline",
                    className: "w-full sm:w-auto",
                  })}
                >
                  Reinitialiser
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle>Liste des interventions</CardTitle>
              <CardDescription>
                Suivi des tickets visibles selon votre role et votre service.
              </CardDescription>
            </div>
            <div className="w-full sm:max-w-xs">
              <Input value={`${interventions.length} resultat(s)`} readOnly />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {interventions.length > 0 ? (
              interventions.map((intervention) => (
                <div
                  key={intervention.id}
                  className="rounded-lg border border-border p-4 transition-colors hover:bg-secondary"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/interventions/${intervention.id}`}
                          className="font-semibold text-foreground underline-offset-4 hover:underline"
                        >
                          {intervention.ticketNumber}
                        </Link>
                        <Badge variant="outline">{PRIORITY_LABELS[intervention.priority]}</Badge>
                        <InterventionStatusBadge
                          label={intervention.status.name}
                          color={intervention.status.color}
                        />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{intervention.title}</p>
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">
                          {intervention.description}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/interventions/${intervention.id}`}
                      className={buttonVariants({ variant: "outline", className: "w-full sm:w-auto" })}
                    >
                      Voir le detail
                    </Link>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-muted sm:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em]">Demandeur</p>
                      <p className="mt-1 text-foreground">
                        {intervention.requester.firstName} {intervention.requester.lastName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em]">Service</p>
                      <p className="mt-1 text-foreground">
                        {intervention.service?.name ?? "Sans service"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em]">Categorie</p>
                      <p className="mt-1 text-foreground">
                        {intervention.category?.name ?? "Non renseignee"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em]">Affectation</p>
                      <p className="mt-1 text-foreground">
                        {intervention.assignedTo
                          ? `${intervention.assignedTo.firstName} ${intervention.assignedTo.lastName}`
                          : "Aucune"}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-secondary p-6 text-sm text-muted">
                Aucune intervention ne correspond a ces filtres pour le moment.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
