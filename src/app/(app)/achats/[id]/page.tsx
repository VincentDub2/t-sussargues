import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { PurchaseDocumentsPanel } from "@/components/purchases/purchase-documents-panel";
import { PurchaseDraftForm } from "@/components/purchases/purchase-draft-form";
import { PurchaseHistoryList } from "@/components/purchases/purchase-history-list";
import { PurchaseStatusBadge } from "@/components/purchases/purchase-status-badge";
import { PurchaseWorkflowForm } from "@/components/purchases/purchase-workflow-form";
import { SubmitPurchaseButton } from "@/components/purchases/submit-purchase-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PRIORITY_LABELS } from "@/lib/labels";
import {
  canEditPurchaseDraft,
  canEditPurchaseDocuments,
  canManagePurchaseWorkflow,
  getPurchaseVisibilityWhere,
  getPurchaseWorkflowTargets,
  isPurchaseClosed,
} from "@/lib/purchases";
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

type PurchaseDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PurchaseDetailPage({
  params,
}: PurchaseDetailPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;

  const purchase = await prisma.purchaseRequest.findFirst({
    where: {
      id,
      AND: [
        getPurchaseVisibilityWhere({
          id: session.user.id,
          role: session.user.role,
          serviceId: session.user.serviceId,
        }),
      ],
    },
    include: {
      requester: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      service: {
        select: {
          name: true,
        },
      },
      validator: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  if (!purchase) {
    notFound();
  }

  const [services, history, documents] = await Promise.all([
    prisma.service.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.purchaseRequestHistory.findMany({
      where: { purchaseRequestId: purchase.id },
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
    prisma.purchaseRequestDocument.findMany({
      where: { purchaseRequestId: purchase.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        documentType: true,
        title: true,
        supplier: true,
        amount: true,
        issuedAt: true,
        reference: true,
        fileName: true,
        note: true,
        createdAt: true,
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
  ]);

  const canEditDraft = canEditPurchaseDraft(
    {
      id: session.user.id,
      role: session.user.role,
      serviceId: session.user.serviceId,
    },
    {
      requesterId: purchase.requesterId,
      serviceId: purchase.serviceId,
      status: purchase.status,
    }
  );

  const canManage = canManagePurchaseWorkflow(
    {
      id: session.user.id,
      role: session.user.role,
      serviceId: session.user.serviceId,
    },
    purchase.serviceId
  );
  const canEditDocuments = canEditPurchaseDocuments(
    {
      id: session.user.id,
      role: session.user.role,
      serviceId: session.user.serviceId,
    },
    {
      requesterId: purchase.requesterId,
      serviceId: purchase.serviceId,
      status: purchase.status,
    }
  );
  const availableWorkflowStatuses = getPurchaseWorkflowTargets(purchase.status);
  const isClosed = isPurchaseClosed(purchase.status);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline">{purchase.requestNumber}</Badge>
              <Badge variant="outline">{PRIORITY_LABELS[purchase.priority]}</Badge>
              <PurchaseStatusBadge status={purchase.status} />
            </div>
            <CardTitle className="text-2xl">{purchase.title}</CardTitle>
            <CardDescription>
              Creee le {purchase.createdAt.toLocaleString("fr-FR")} par{" "}
              {purchase.requester.firstName} {purchase.requester.lastName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg border border-border bg-secondary p-4 text-sm leading-6 text-foreground">
              {purchase.description}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Service</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {purchase.service?.name ?? "Sans service"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Fournisseur</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {purchase.supplier ?? "Non renseigne"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Quantite</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {purchase.quantity ?? "Non renseignee"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Budget estime</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {formatBudget(purchase.estimatedBudget?.toString() ?? null)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acces rapide</CardTitle>
            <CardDescription>
              Revenez a la liste ou poursuivez le workflow selon vos droits.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link
              href="/achats"
              className={buttonVariants({ variant: "outline", className: "w-full" })}
            >
              Retour a la liste
            </Link>

            {purchase.status === "brouillon" || purchase.status === "informations_demandees" ? (
              <SubmitPurchaseButton
                purchaseId={purchase.id}
                status={purchase.status}
                disabled={!canEditDraft}
              />
            ) : null}

            <div className="rounded-lg border border-border bg-secondary p-4 text-sm text-muted">
              {isClosed
                ? "Cette demande est cloturee. Elle reste consultable, mais plus aucune modification n'est possible."
                : canManage
                ? "Vous pouvez valider, refuser, demander des informations ou cloturer selon l'etat de la demande."
                : canEditDraft
                  ? "Vous pouvez completer cette demande puis la soumettre ou la renvoyer pour validation."
                  : "Cette demande est visible dans votre perimetre actuel."}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Demande</CardTitle>
            <CardDescription>
              Edition possible tant que la demande est en brouillon ou en attente d&apos;informations complementaires.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PurchaseDraftForm
              purchase={{
                id: purchase.id,
                title: purchase.title,
                description: purchase.description,
                supplier: purchase.supplier,
                quantity: purchase.quantity,
                estimatedBudget: purchase.estimatedBudget?.toString() ?? null,
                priority: purchase.priority,
                serviceId: purchase.serviceId,
              }}
              services={services}
              disabled={!canEditDraft}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Validation</CardTitle>
            <CardDescription>
              Workflow metier: soumission, informations complementaires, decision, puis cloture.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {availableWorkflowStatuses.length > 0 ? (
              <PurchaseWorkflowForm
                purchase={{
                  id: purchase.id,
                  status: purchase.status,
                  validationComment: purchase.validationComment,
                }}
                availableStatuses={[...availableWorkflowStatuses]}
                disabled={!canManage}
              />
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-secondary p-4 text-sm text-muted">
                {isClosed
                  ? "Cette demande est deja cloturee."
                  : "Aucune action de workflow n'est disponible pour l'etat actuel de la demande."}
              </div>
            )}

            <Separator />

            <div className="grid gap-3 text-sm text-muted">
              <div>
                <p className="font-medium text-foreground">Demandeur</p>
                <p>
                  {purchase.requester.firstName} {purchase.requester.lastName} ·{" "}
                  {purchase.requester.email}
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground">Decision</p>
                <p>
                  {purchase.validator
                    ? `${purchase.validator.firstName} ${purchase.validator.lastName} · ${purchase.validator.email}`
                    : "Aucune decision pour le moment"}
                </p>
              </div>
              {purchase.validationComment ? (
                <div>
                  <p className="font-medium text-foreground">Commentaire</p>
                  <p>{purchase.validationComment}</p>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Justificatifs</CardTitle>
          <CardDescription>
            Devis, tickets de caisse, factures et bons de commande rattaches a cette demande.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PurchaseDocumentsPanel
            purchaseId={purchase.id}
            disabled={!canEditDocuments}
            documents={documents.map((document) => ({
              id: document.id,
              documentType: document.documentType,
              title: document.title,
              supplier: document.supplier,
              amount: document.amount?.toString() ?? null,
              issuedAt: document.issuedAt?.toISOString() ?? null,
              reference: document.reference,
              fileName: document.fileName,
              note: document.note,
              createdByName: document.createdBy
                ? `${document.createdBy.firstName} ${document.createdBy.lastName}`
                : null,
              createdAt: document.createdAt.toISOString(),
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique</CardTitle>
          <CardDescription>
            Trace des validations, refus, demandes d&apos;informations et clotures sur cette demande d&apos;achat.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PurchaseHistoryList entries={history} />
        </CardContent>
      </Card>
    </div>
  );
}
