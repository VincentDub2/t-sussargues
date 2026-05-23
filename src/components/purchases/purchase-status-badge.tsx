import type { PurchaseStatus } from "@/generated/prisma/client";
import { PURCHASE_STATUS_LABELS } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";

type PurchaseStatusBadgeProps = {
  status: PurchaseStatus;
};

const statusVariants: Record<PurchaseStatus, string> = {
  brouillon: "bg-secondary text-foreground",
  soumise: "bg-primary text-[var(--primary-foreground)]",
  en_validation: "bg-secondary text-foreground",
  informations_demandees: "bg-secondary text-foreground",
  validee: "bg-success text-white",
  refusee: "bg-danger text-white",
  en_commande: "bg-secondary text-foreground",
  receptionnee: "bg-secondary text-foreground",
  cloturee: "bg-secondary text-foreground",
};

export function PurchaseStatusBadge({ status }: PurchaseStatusBadgeProps) {
  return (
    <Badge className={statusVariants[status]}>{PURCHASE_STATUS_LABELS[status]}</Badge>
  );
}
