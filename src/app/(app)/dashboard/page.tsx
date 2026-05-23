import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CheckSquare,
  ClipboardList,
  ShoppingCart,
} from "lucide-react";

import { auth } from "@/auth";
import { InterventionStatusBadge } from "@/components/interventions/intervention-status-badge";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatUserDisplayName,
  INTERVENTION_HISTORY_ACTION_LABELS,
} from "@/lib/intervention-history";
import { PRIORITY_LABELS } from "@/lib/labels";
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
    pendingPurchasesCount,
    validationsToTreatCount,
    recentInterventionHistory,
    recentPurchaseHistory,
    recentInterventions,
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
              in: ["brouillon", "soumise", "informations_demandees"],
            },
          },
        ],
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
      where: interventionVisibility,
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
  ]);

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

  const dashboardStats = [
    {
      label: "Interventions ouvertes",
      value: openInterventionsCount,
      helper: "Tickets encore en cours dans votre perimetre",
      icon: ClipboardList,
    },
    {
      label: "Interventions urgentes",
      value: urgentInterventionsCount,
      helper: "Priorite urgente a traiter rapidement",
      icon: AlertTriangle,
    },
    {
      label: "Achats en attente",
      value: pendingPurchasesCount,
      helper: "Brouillons, soumissions et retours d'information visibles",
      icon: ShoppingCart,
    },
    {
      label: "Validations a traiter",
      value: validationsToTreatCount,
      helper: canManagePurchases
        ? "Demandes soumises qui attendent votre decision"
        : "Accessible aux admins et responsables de service",
      icon: CheckSquare,
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
              Vue rapide des urgences, des validations et de l&apos;activite recente dans votre perimetre.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {dashboardStats.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-border bg-secondary p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <p className="text-sm text-muted">{item.label}</p>
                    <p className="text-3xl font-semibold text-foreground">{item.value}</p>
                  </div>
                  <item.icon className="mt-1 size-4 text-primary" />
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">{item.helper}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Priorites du moment</CardTitle>
            <CardDescription>
              Ce qui demande votre attention immediate.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border bg-secondary p-4">
              <div className="flex items-start gap-3">
                <BellRing className="mt-1 size-4 text-primary" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground">
                    {urgentInterventionsCount > 0
                      ? `${urgentInterventionsCount} intervention(s) urgente(s)`
                      : "Aucune urgence detectee"}
                  </p>
                  <p className="text-sm leading-6 text-muted">
                    {urgentInterventionsCount > 0
                      ? "Passez par la liste des interventions pour prioriser les tickets critiques."
                      : "Le niveau d'urgence est stable pour le moment."}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-secondary p-4">
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
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/interventions"
                className={buttonVariants({
                  className: "w-full sm:w-auto !text-white font-bold",
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
            <CardTitle>Dernieres actions</CardTitle>
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
            <CardTitle>Dernieres interventions</CardTitle>
            <CardDescription>
              Les derniers tickets crees ou visibles dans votre espace de travail.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentInterventions.length > 0 ? (
              recentInterventions.map((intervention) => (
                <div
                  key={intervention.id}
                  className="rounded-lg border border-border p-4"
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
                        <Badge variant="outline">
                          {PRIORITY_LABELS[intervention.priority]}
                        </Badge>
                        <InterventionStatusBadge
                          label={intervention.status.name}
                          color={intervention.status.color}
                        />
                      </div>
                      <p className="font-medium text-foreground">{intervention.title}</p>
                    </div>

                    <Link
                      href={`/interventions/${intervention.id}`}
                      className={buttonVariants({
                        variant: "outline",
                        className: "w-full sm:w-auto",
                      })}
                    >
                      Voir
                    </Link>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-muted sm:grid-cols-2">
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
                      <p className="text-xs uppercase tracking-[0.18em]">Creation</p>
                      <p className="mt-1 text-foreground">
                        {formatDateTime(intervention.createdAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em]">Etat</p>
                      <p className="mt-1 text-foreground">
                        {intervention.closedAt ? "Cloturee" : "Ouverte"}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-secondary p-5 text-sm text-muted">
                Aucune intervention recente n&apos;est visible pour le moment.
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
