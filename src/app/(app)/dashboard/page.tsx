import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CheckSquare,
  ClipboardList,
  ListTodo,
  ShoppingCart,
  UserRoundX,
} from "lucide-react";

import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PurchaseStatus } from "@/generated/prisma/client";
import {
  formatUserDisplayName,
  INTERVENTION_HISTORY_ACTION_LABELS,
} from "@/lib/intervention-history";
import { PRIORITY_LABELS, PURCHASE_STATUS_LABELS } from "@/lib/labels";
import {
  formatPurchaseActorDisplayName,
  PURCHASE_HISTORY_ACTION_LABELS,
} from "@/lib/purchase-history";
import { getInterventionVisibilityWhere } from "@/lib/interventions";
import { getPurchaseVisibilityWhere, isPurchaseManagerRole } from "@/lib/purchases";
import { prisma } from "@/lib/prisma";

function formatDateTime(value: Date) {
  return value.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type DashboardAction =
  | {
      id: string;
      kind: "intervention";
      createdAt: Date;
      label: string;
      message: string;
      actorName: string;
      href: string;
      reference: string;
      title: string;
    }
  | {
      id: string;
      kind: "purchase";
      createdAt: Date;
      label: string;
      message: string;
      actorName: string;
      href: string;
      reference: string;
      title: string;
    };

const openPurchaseStatuses: PurchaseStatus[] = [
  "brouillon",
  "soumise",
  "en_validation",
  "informations_demandees",
  "validee",
  "en_commande",
  "receptionnee",
];

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const scope = {
    id: session.user.id,
    role: session.user.role,
    serviceId: session.user.serviceId,
  };

  const interventionVisibility = getInterventionVisibilityWhere(scope);
  const purchaseVisibility = getPurchaseVisibilityWhere(scope);
  const canManagePurchases = isPurchaseManagerRole(session.user.role);

  const [
    openInterventionsCount,
    urgentInterventionsCount,
    openPurchasesCount,
    urgentPurchasesCount,
    unassignedInterventionsCount,
    validationsToTreatCount,
    recentInterventionHistory,
    recentPurchaseHistory,
    recentInterventions,
    recentPurchases,
  ] = await Promise.all([
    prisma.intervention.count({
      where: {
        AND: [interventionVisibility, { closedAt: null }],
      },
    }),
    prisma.intervention.count({
      where: {
        AND: [interventionVisibility, { closedAt: null, priority: "urgente" }],
      },
    }),
    prisma.purchaseRequest.count({
      where: {
        AND: [
          purchaseVisibility,
          {
            status: {
              in: openPurchaseStatuses,
            },
          },
        ],
      },
    }),
    prisma.purchaseRequest.count({
      where: {
        AND: [
          purchaseVisibility,
          {
            priority: "urgente",
            status: {
              in: openPurchaseStatuses,
            },
          },
        ],
      },
    }),
    prisma.intervention.count({
      where: {
        AND: [interventionVisibility, { closedAt: null, assignedToId: null }],
      },
    }),
    canManagePurchases
      ? prisma.purchaseRequest.count({
          where: {
            status: "soumise",
            ...(session.user.role === "responsable_service" && session.user.serviceId
              ? { serviceId: session.user.serviceId }
              : {}),
          },
        })
      : Promise.resolve(0),
    prisma.interventionHistory.findMany({
      where: {
        intervention: {
          is: interventionVisibility,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
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
        intervention: {
          select: {
            id: true,
            ticketNumber: true,
            title: true,
          },
        },
      },
    }),
    prisma.purchaseRequestHistory.findMany({
      where: {
        purchaseRequest: {
          is: purchaseVisibility,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
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
        purchaseRequest: {
          select: {
            id: true,
            requestNumber: true,
            title: true,
          },
        },
      },
    }),
    prisma.intervention.findMany({
      where: {
        AND: [interventionVisibility, { closedAt: null }],
      },
      orderBy: [{ createdAt: "desc" }],
      take: 5,
      include: {
        status: true,
        service: {
          select: {
            name: true,
          },
        },
        requester: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
    prisma.purchaseRequest.findMany({
      where: {
        AND: [
          purchaseVisibility,
          {
            status: {
              in: openPurchaseStatuses,
            },
          },
        ],
      },
      orderBy: [{ createdAt: "desc" }],
      take: 5,
      include: {
        service: {
          select: {
            name: true,
          },
        },
        requester: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
  ]);

  const urgentRequestsCount = urgentInterventionsCount + urgentPurchasesCount;
  const openRequestsCount = openInterventionsCount + openPurchasesCount;

  const recentActions = [
    ...recentInterventionHistory.map<DashboardAction>((entry) => ({
      id: `intervention-${entry.id}`,
      kind: "intervention",
      createdAt: entry.createdAt,
      label: INTERVENTION_HISTORY_ACTION_LABELS[entry.action],
      message: entry.message,
      actorName: formatUserDisplayName(entry.actor),
      href: `/interventions/${entry.intervention.id}`,
      reference: entry.intervention.ticketNumber,
      title: entry.intervention.title,
    })),
    ...recentPurchaseHistory.map<DashboardAction>((entry) => ({
      id: `purchase-${entry.id}`,
      kind: "purchase",
      createdAt: entry.createdAt,
      label: PURCHASE_HISTORY_ACTION_LABELS[entry.action],
      message: entry.message,
      actorName: formatPurchaseActorDisplayName(entry.actor),
      href: `/achats/${entry.purchaseRequest.id}`,
      reference: entry.purchaseRequest.requestNumber,
      title: entry.purchaseRequest.title,
    })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 8);

  const recentRequests = [
    ...recentInterventions.map((intervention) => ({
      id: `intervention-${intervention.id}`,
      kind: "intervention" as const,
      href: `/interventions/${intervention.id}`,
      reference: intervention.ticketNumber,
      title: intervention.title,
      createdAt: intervention.createdAt,
      priorityLabel: PRIORITY_LABELS[intervention.priority],
      statusLabel: intervention.status.name,
      serviceName: intervention.service?.name ?? "Sans service",
      requesterName: `${intervention.requester.firstName} ${intervention.requester.lastName}`,
    })),
    ...recentPurchases.map((purchase) => ({
      id: `purchase-${purchase.id}`,
      kind: "purchase" as const,
      href: `/achats/${purchase.id}`,
      reference: purchase.requestNumber,
      title: purchase.title,
      createdAt: purchase.createdAt,
      priorityLabel: PRIORITY_LABELS[purchase.priority],
      statusLabel: PURCHASE_STATUS_LABELS[purchase.status],
      serviceName: purchase.service?.name ?? "Sans service",
      requesterName: `${purchase.requester.firstName} ${purchase.requester.lastName}`,
    })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 6);

  const dashboardStats = [
    {
      label: "Demandes urgentes",
      value: urgentRequestsCount,
      helper: `${urgentInterventionsCount} intervention(s) · ${urgentPurchasesCount} achat(s)`,
      icon: AlertTriangle,
      href: "/interventions",
    },
    {
      label: "Demandes ouvertes",
      value: openRequestsCount,
      helper: `${openInterventionsCount} intervention(s) · ${openPurchasesCount} achat(s)`,
      icon: ListTodo,
      href: "/interventions",
    },
    {
      label: "Interventions non assignees",
      value: unassignedInterventionsCount,
      helper: "Tickets ouverts sans agent affecte",
      icon: UserRoundX,
      href: "/interventions",
    },
    {
      label: "Achats ouverts",
      value: openPurchasesCount,
      helper: "Demandes d'achat encore en cours",
      icon: ShoppingCart,
      href: "/achats",
    },
  ] as const;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader>
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Vue generale</p>
            <CardTitle className="text-2xl">Dashboard</CardTitle>
            <CardDescription>
              Vue rapide des demandes urgentes, ouvertes et non assignees dans votre perimetre.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {dashboardStats.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-lg border border-border bg-secondary p-4 transition-colors hover:bg-muted/70"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <p className="text-sm text-muted">{item.label}</p>
                    <p className="text-3xl font-semibold text-foreground">{item.value}</p>
                  </div>
                  <item.icon className="mt-1 size-4 text-primary" />
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">{item.helper}</p>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>A traiter maintenant</CardTitle>
            <CardDescription>
              Ce qui demande votre attention immediate.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link
              href="/interventions"
              className="block rounded-lg border border-border bg-secondary p-4 transition-colors hover:bg-muted/70"
            >
              <div className="flex items-start gap-3">
                <BellRing className="mt-1 size-4 text-primary" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground">
                    {urgentRequestsCount > 0
                      ? `${urgentRequestsCount} demande(s) urgente(s)`
                      : "Aucune urgence detectee"}
                  </p>
                  <p className="text-sm leading-6 text-muted">
                    {urgentRequestsCount > 0
                      ? `${urgentInterventionsCount} intervention(s) et ${urgentPurchasesCount} achat(s) a prioriser.`
                      : "Le niveau d'urgence est stable pour le moment."}
                  </p>
                </div>
              </div>
            </Link>

            <Link
              href="/interventions"
              className="block rounded-lg border border-border bg-secondary p-4 transition-colors hover:bg-muted/70"
            >
              <div className="flex items-start gap-3">
                <UserRoundX className="mt-1 size-4 text-primary" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground">
                    {unassignedInterventionsCount > 0
                      ? `${unassignedInterventionsCount} intervention(s) non assignee(s)`
                      : "Aucune intervention sans agent"}
                  </p>
                  <p className="text-sm leading-6 text-muted">
                    {unassignedInterventionsCount > 0
                      ? "Affectez les tickets ouverts pour eviter qu'ils restent sans suivi."
                      : "Les tickets ouverts visibles ont deja un responsable ou n'ont pas besoin d'affectation."}
                  </p>
                </div>
              </div>
            </Link>

            <Link
              href="/achats"
              className="block rounded-lg border border-border bg-secondary p-4 transition-colors hover:bg-muted/70"
            >
              <div className="flex items-start gap-3">
                <CheckSquare className="mt-1 size-4 text-primary" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground">
                    {canManagePurchases
                      ? `${validationsToTreatCount} validation(s) achat a traiter`
                      : "Validation achat reservee aux managers"}
                  </p>
                  <p className="text-sm leading-6 text-muted">
                    {canManagePurchases
                      ? "Les demandes soumises apparaissent aussi dans le module achats."
                      : "Vous gardez en revanche la visibilite sur vos propres demandes d'achat."}
                  </p>
                </div>
              </div>
            </Link>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/interventions"
                className={buttonVariants({
                  className: "w-full font-bold !text-white hover:!text-white sm:w-auto",
                })}
              >
                Ouvrir les interventions
              </Link>
              <Link
                href="/achats"
                className={buttonVariants({
                  variant: "outline",
                  className: "w-full sm:w-auto",
                })}
              >
                Ouvrir les achats
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Dernieres actions utiles</CardTitle>
            <CardDescription>
              Journal recent des interventions et des demandes d&apos;achat visibles pour vous.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActions.length > 0 ? (
              recentActions.map((action) => (
                <Link
                  key={action.id}
                  href={action.href}
                  className="block rounded-lg border border-border p-4 transition-colors hover:bg-secondary"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {action.kind === "intervention" ? "Intervention" : "Achat"}
                    </Badge>
                    <Badge variant="outline">{action.label}</Badge>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted">
                      {formatDateTime(action.createdAt)}
                    </p>
                  </div>

                  <div className="mt-3 flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium text-foreground">
                        {action.reference} · {action.title}
                      </p>
                      <p className="text-sm leading-6 text-muted">{action.message}</p>
                      <p className="text-sm text-muted">Par {action.actorName}</p>
                    </div>
                    <ArrowRight className="mt-1 size-4 shrink-0 text-muted" />
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-secondary p-5 text-sm text-muted">
                Aucune action recente n&apos;est encore visible dans votre perimetre.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Demandes recentes</CardTitle>
            <CardDescription>
              Dernieres demandes ouvertes, interventions et achats confondus.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentRequests.length > 0 ? (
              recentRequests.map((request) => (
                <Link
                  key={request.id}
                  href={request.href}
                  className="block rounded-lg border border-border p-4 transition-colors hover:bg-secondary"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">
                          {request.kind === "intervention" ? "Intervention" : "Achat"}
                        </Badge>
                        <span className="font-semibold text-foreground">
                          {request.reference}
                        </span>
                        <Badge variant="outline">
                          {request.priorityLabel}
                        </Badge>
                        <Badge variant="outline">{request.statusLabel}</Badge>
                      </div>
                      <p className="font-medium text-foreground">{request.title}</p>
                    </div>

                    <ArrowRight className="mt-1 size-4 shrink-0 text-muted" />
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-muted sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em]">Demandeur</p>
                      <p className="mt-1 text-foreground">
                        {request.requesterName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em]">Service</p>
                      <p className="mt-1 text-foreground">
                        {request.serviceName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em]">Creation</p>
                      <p className="mt-1 text-foreground">
                        {formatDateTime(request.createdAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em]">Type</p>
                      <p className="mt-1 text-foreground">
                        {request.kind === "intervention" ? "Intervention" : "Achat"}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-secondary p-5 text-sm text-muted">
                Aucune demande ouverte n&apos;est visible pour le moment.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Acces rapides</CardTitle>
            <CardDescription>
              Raccourcis vers les deux flux metier principaux.
            </CardDescription>
          </div>
          <Badge variant="outline">
            {session.user.firstName} {session.user.lastName}
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Link
            href="/interventions"
            className="rounded-lg border border-border p-4 transition-colors hover:bg-secondary"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">Suivre les interventions</p>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Voir les tickets ouverts, les urgences et les affectations.
                </p>
              </div>
              <ClipboardList className="size-4 shrink-0 text-primary" />
            </div>
          </Link>

          <Link
            href="/achats"
            className="rounded-lg border border-border p-4 transition-colors hover:bg-secondary"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">Suivre les achats</p>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Reprendre les brouillons, lire les decisions et traiter les validations.
                </p>
              </div>
              <ShoppingCart className="size-4 shrink-0 text-primary" />
            </div>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
