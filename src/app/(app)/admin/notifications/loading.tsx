import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const metricCards = ["configured", "active", "disabled"] as const;
const eventCards = ["event-1", "event-2", "event-3"] as const;
const logRows = ["log-1", "log-2", "log-3"] as const;

export default function AdminNotificationsLoading() {
  return (
    <div className="space-y-6" aria-live="polite" aria-busy="true">
      <span className="sr-only">Chargement des notifications</span>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader>
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-8 w-72 max-w-full" />
            <Skeleton className="h-4 w-full max-w-2xl" />
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {metricCards.map((card) => (
              <div
                key={card}
                className="rounded-lg border border-border bg-secondary p-4"
              >
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-3 h-8 w-14" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-full max-w-sm" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/5" />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        {eventCards.map((event) => (
          <Card key={event}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-56 max-w-full" />
                  <Skeleton className="h-4 w-80 max-w-full" />
                </div>
                <Skeleton className="h-9 w-28" />
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 lg:grid-cols-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-full max-w-lg" />
        </CardHeader>
        <CardContent className="space-y-3">
          {logRows.map((log) => (
            <div key={log} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-28" />
              </div>
              <Skeleton className="mt-3 h-4 w-full max-w-xl" />
              <Skeleton className="mt-2 h-3 w-32" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
