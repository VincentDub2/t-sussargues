import type { InterventionHistoryAction } from "@/generated/prisma/client";
import {
  formatUserDisplayName,
  INTERVENTION_HISTORY_ACTION_LABELS,
} from "@/lib/intervention-history";
import { Badge } from "@/components/ui/badge";

type InterventionHistoryListProps = {
  entries: Array<{
    id: string;
    action: InterventionHistoryAction;
    message: string;
    createdAt: Date;
    actor: {
      firstName: string;
      lastName: string;
    } | null;
  }>;
};

export function InterventionHistoryList({
  entries,
}: InterventionHistoryListProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-secondary p-5 text-sm text-muted">
        Aucun evenement n&apos;a encore ete journalise pour cette intervention.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div key={entry.id} className="rounded-lg border border-border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {INTERVENTION_HISTORY_ACTION_LABELS[entry.action]}
            </Badge>
            <p className="text-xs uppercase tracking-[0.18em] text-muted">
              {entry.createdAt.toLocaleString("fr-FR")}
            </p>
          </div>
          <p className="mt-3 text-sm leading-6 text-foreground">{entry.message}</p>
          <p className="mt-2 text-sm text-muted">
            Par {formatUserDisplayName(entry.actor)}
          </p>
        </div>
      ))}
    </div>
  );
}
