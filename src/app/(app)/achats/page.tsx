import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { CreatePurchaseDialog } from "@/components/purchases/create-purchase-dialog";
import { PurchasesDataTable } from "@/components/purchases/purchases-data-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPurchaseVisibilityWhere, isPurchaseManagerRole } from "@/lib/purchases";
import { prisma } from "@/lib/prisma";

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
      <section>
        <Card>
          <CardHeader>
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Module metier</p>
            <CardTitle className="text-2xl">Demandes d&apos;achat</CardTitle>
            <CardDescription>
              Suivi des demandes de depense avec devis, tickets, factures et validation.
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
      </section>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Liste des demandes</CardTitle>
            <CardDescription>
              Les responsables voient les demandes de leur service, les autres voient leurs propres brouillons et soumissions.
            </CardDescription>
          </div>
          <CreatePurchaseDialog
            services={services}
            defaultServiceId={session.user.serviceId}
            canChooseService={canChooseService}
          />
        </CardHeader>
        <CardContent>
          <PurchasesDataTable
            purchases={purchases.map((purchase) => ({
              id: purchase.id,
              requestNumber: purchase.requestNumber,
              title: purchase.title,
              description: purchase.description,
              priority: purchase.priority,
              status: purchase.status,
              estimatedBudget: purchase.estimatedBudget?.toString() ?? null,
              requesterName: `${purchase.requester.firstName} ${purchase.requester.lastName}`,
              serviceName: purchase.service?.name ?? null,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
