import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { CreatePurchaseForm } from "@/components/purchases/create-purchase-form";
import { PurchaseStatusBadge } from "@/components/purchases/purchase-status-badge";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PRIORITY_LABELS } from "@/lib/labels";
import { getPurchaseVisibilityWhere, isPurchaseManagerRole } from "@/lib/purchases";
import { prisma } from "@/lib/prisma";

function formatBudget(value: string | null) {
  if (!value) {
    return "Non renseigne";
  }

  return `${Number(value).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} EUR`;
}

export default async function AchatsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const [purchases, services, submittedCount] = await Promise.all([
    prisma.purchaseRequest.findMany({
      where: getPurchaseVisibilityWhere({
        id: session.user.id,
        role: session.user.role,
        serviceId: session.user.serviceId,
      }),
      orderBy: [{ createdAt: "desc" }],
      include: {
        requester: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        service: {
          select: {
            name: true,
          },
        },
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
    prisma.purchaseRequest.count({
      where: {
        status: "soumise",
        ...(session.user.role === "responsable_service" && session.user.serviceId
          ? { serviceId: session.user.serviceId }
          : {}),
      },
    }),
  ]);

  const canChooseService =
    session.user.role === "admin" || session.user.role === "responsable_service";
  const managerAccess = isPurchaseManagerRole(session.user.role);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.9fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader>
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Module metier</p>
            <CardTitle className="text-2xl">Demandes d&apos;achat</CardTitle>
            <CardDescription>
              Suivi simple des besoins d&apos;achat avec brouillon, soumission et decision.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-secondary p-4">
              <p className="text-sm text-muted">Demandes visibles</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{purchases.length}</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary p-4">
              <p className="text-sm text-muted">A soumettre ou suivre</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {purchases.filter((purchase) => ["brouillon", "soumise"].includes(purchase.status)).length}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-secondary p-4">
              <p className="text-sm text-muted">En attente de decision</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {managerAccess ? submittedCount : 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Nouvelle demande</CardTitle>
            <CardDescription>
              Creez un brouillon, puis soumettez-le pour validation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreatePurchaseForm
              services={services}
              defaultServiceId={session.user.serviceId}
              canChooseService={canChooseService}
            />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Liste des demandes</CardTitle>
          <CardDescription>
            Les responsables voient les demandes de leur service, les autres voient leurs propres brouillons et soumissions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {purchases.length > 0 ? (
            purchases.map((purchase) => (
              <div
                key={purchase.id}
                className="rounded-lg border border-border p-4 transition-colors hover:bg-secondary"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/achats/${purchase.id}`}
                        className="font-semibold text-foreground underline-offset-4 hover:underline"
                      >
                        {purchase.requestNumber}
                      </Link>
                      <Badge variant="outline">{PRIORITY_LABELS[purchase.priority]}</Badge>
                      <PurchaseStatusBadge status={purchase.status} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{purchase.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">
                        {purchase.description}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/achats/${purchase.id}`}
                    className={buttonVariants({ variant: "outline", className: "w-full sm:w-auto" })}
                  >
                    Voir le detail
                  </Link>
                </div>

                <div className="mt-4 grid gap-3 text-sm text-muted sm:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em]">Demandeur</p>
                    <p className="mt-1 text-foreground">
                      {purchase.requester.firstName} {purchase.requester.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em]">Service</p>
                    <p className="mt-1 text-foreground">
                      {purchase.service?.name ?? "Sans service"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em]">Budget estime</p>
                    <p className="mt-1 text-foreground">{formatBudget(purchase.estimatedBudget?.toString() ?? null)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em]">Priorite</p>
                    <p className="mt-1 text-foreground">{PRIORITY_LABELS[purchase.priority]}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-secondary p-6 text-sm text-muted">
              Aucune demande d&apos;achat n&apos;est visible pour le moment.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
