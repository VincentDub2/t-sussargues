import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const metricCards = ["visible", "assigned", "status"] as const;
const tableRows = ["row-1", "row-2", "row-3", "row-4", "row-5"] as const;

export default function Loading() {
  return (
    <div className="space-y-6" aria-live="polite" aria-busy="true">
      <span className="sr-only">Chargement de la page</span>

      <section>
        <Card>
          <CardHeader>
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-8 w-64 max-w-full" />
            <Skeleton className="h-4 w-full max-w-2xl" />
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {metricCards.map((card) => (
              <div
                key={card}
                className="rounded-lg border border-border bg-secondary p-4"
              >
                <Skeleton className="h-4 w-28" />
                <Skeleton className="mt-3 h-8 w-16" />
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-80 max-w-full" />
            </div>
            <Skeleton className="h-10 w-36" />
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="grid grid-cols-[1.2fr_1fr_1fr_0.7fr] gap-4 border-b border-border bg-secondary px-4 py-3">
                <Skeleton className="h-4" />
                <Skeleton className="h-4" />
                <Skeleton className="h-4" />
                <Skeleton className="h-4" />
              </div>
              <div className="divide-y divide-border bg-card">
                {tableRows.map((row) => (
                  <div
                    key={row}
                    className="grid grid-cols-[1.2fr_1fr_1fr_0.7fr] gap-4 px-4 py-4"
                  >
                    <Skeleton className="h-5" />
                    <Skeleton className="h-5" />
                    <Skeleton className="h-5" />
                    <Skeleton className="h-5" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
