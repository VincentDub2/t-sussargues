"use client";

import { Download, FileText, Trash2 } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import {
  createPurchaseDocument,
  deletePurchaseDocument,
  type PurchaseActionState,
} from "@/app/(app)/achats/actions";
import type { PurchaseDocumentType } from "@/generated/prisma/client";
import { PURCHASE_DOCUMENT_TYPE_LABELS } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";

type PurchaseDocumentRecord = {
  id: string;
  documentType: PurchaseDocumentType;
  title: string;
  supplier: string | null;
  amount: string | null;
  issuedAt: string | null;
  reference: string | null;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  downloadHref: string | null;
  note: string | null;
  createdByName: string | null;
  createdAt: string;
};

type PurchaseDocumentsPanelProps = {
  purchaseId: string;
  documents: PurchaseDocumentRecord[];
  disabled?: boolean;
};

const documentTypes: PurchaseDocumentType[] = [
  "devis",
  "ticket_caisse",
  "facture",
  "bon_commande",
  "autre",
];
const initialState: PurchaseActionState = {};

function formatAmount(value: string | null) {
  if (!value) {
    return "Montant non renseigne";
  }

  return `${Number(value).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} EUR`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Date non renseignee";
  }

  return new Date(value).toLocaleDateString("fr-FR");
}

function formatFileSize(value: number | null) {
  if (!value) {
    return null;
  }

  if (value < 1024 * 1024) {
    return `${Math.ceil(value / 1024).toLocaleString("fr-FR")} Ko`;
  }

  return `${(value / 1024 / 1024).toLocaleString("fr-FR", {
    maximumFractionDigits: 1,
  })} Mo`;
}

function AddDocumentButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button disabled={disabled || pending}>
      {pending ? "Ajout..." : "Ajouter le justificatif"}
    </Button>
  );
}

function DeleteDocumentButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="ghost"
      size="icon"
      disabled={pending}
      aria-label="Supprimer le justificatif"
    >
      <Trash2 className="size-4" />
    </Button>
  );
}

function DeleteDocumentForm({
  purchaseId,
  documentId,
  disabled,
}: {
  purchaseId: string;
  documentId: string;
  disabled?: boolean;
}) {
  const action = deletePurchaseDocument.bind(null, purchaseId, documentId);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex items-center gap-2">
      {state.error ? <p className="text-xs text-danger">{state.error}</p> : null}
      {disabled ? null : <DeleteDocumentButton />}
    </form>
  );
}

export function PurchaseDocumentsPanel({
  purchaseId,
  documents,
  disabled = false,
}: PurchaseDocumentsPanelProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const action = createPurchaseDocument.bind(null, purchaseId);
  const [state, formAction] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {documents.length > 0 ? (
          documents.map((document) => (
            <div
              key={document.id}
              className="rounded-lg border border-border bg-secondary p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {PURCHASE_DOCUMENT_TYPE_LABELS[document.documentType]}
                    </Badge>
                    <p className="font-medium text-foreground">{document.title}</p>
                  </div>
                  <div className="grid gap-1 text-sm text-muted sm:grid-cols-2">
                    <p>{document.supplier ?? "Fournisseur non renseigne"}</p>
                    <p>{formatAmount(document.amount)}</p>
                    <p>{formatDate(document.issuedAt)}</p>
                    <p>{document.reference ?? "Reference non renseignee"}</p>
                  </div>
                  {document.fileName ? (
                    <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <FileText className="size-4 shrink-0 text-muted" />
                        <span className="truncate">{document.fileName}</span>
                      </span>
                      {formatFileSize(document.fileSize) ? (
                        <span className="text-muted">
                          {formatFileSize(document.fileSize)}
                        </span>
                      ) : null}
                      {document.downloadHref ? (
                        <a
                          href={document.downloadHref}
                          className="inline-flex items-center gap-1 font-medium text-primary hover:text-primary-deep"
                        >
                          <Download className="size-4" />
                          Telecharger
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                  {document.note ? (
                    <p className="text-sm leading-6 text-muted">{document.note}</p>
                  ) : null}
                  <p className="text-xs text-muted">
                    Ajoute le {new Date(document.createdAt).toLocaleString("fr-FR")}
                    {document.createdByName ? ` par ${document.createdByName}` : ""}
                  </p>
                </div>

                <DeleteDocumentForm
                  purchaseId={purchaseId}
                  documentId={document.id}
                  disabled={disabled}
                />
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-secondary p-4 text-sm text-muted">
            Aucun devis, ticket, facture ou bon de commande n&apos;est encore rattache.
          </div>
        )}
      </div>

      <form
        ref={formRef}
        action={formAction}
        className="space-y-4"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="documentType" className="text-sm font-medium text-foreground">
              Type
            </label>
            <SelectField
              id="documentType"
              name="documentType"
              defaultValue="devis"
              disabled={disabled}
            >
              {documentTypes.map((documentType) => (
                <option key={documentType} value={documentType}>
                  {PURCHASE_DOCUMENT_TYPE_LABELS[documentType]}
                </option>
              ))}
            </SelectField>
          </div>

          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium text-foreground">
              Libelle
            </label>
            <Input
              id="title"
              name="title"
              required
              disabled={disabled}
              placeholder="Devis peinture salle des fetes"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="documentSupplier" className="text-sm font-medium text-foreground">
              Fournisseur
            </label>
            <Input id="documentSupplier" name="supplier" disabled={disabled} />
          </div>

          <div className="space-y-2">
            <label htmlFor="amount" className="text-sm font-medium text-foreground">
              Montant (EUR)
            </label>
            <Input id="amount" name="amount" inputMode="decimal" disabled={disabled} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="issuedAt" className="text-sm font-medium text-foreground">
              Date du document
            </label>
            <Input id="issuedAt" name="issuedAt" type="date" disabled={disabled} />
          </div>

          <div className="space-y-2">
            <label htmlFor="reference" className="text-sm font-medium text-foreground">
              Reference
            </label>
            <Input id="reference" name="reference" disabled={disabled} />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="file" className="text-sm font-medium text-foreground">
            Fichier
          </label>
          <Input
            id="file"
            name="file"
            type="file"
            disabled={disabled}
            accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx,.txt"
          />
          <p className="text-xs text-muted">
            PDF, photo ou document bureautique. Taille maximale: 15 Mo.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="note" className="text-sm font-medium text-foreground">
            Note
          </label>
          <Textarea id="note" name="note" disabled={disabled} />
        </div>

        {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
        {state.success ? <p className="text-sm text-success">{state.success}</p> : null}

        <AddDocumentButton disabled={disabled} />
      </form>
    </div>
  );
}
