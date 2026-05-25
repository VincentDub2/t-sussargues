import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const listRows = ["item-1", "item-2", "item-3", "item-4"] as const;

export default function AdminLoading() {
  return (
    <div className="space-y-6" aria-live="polite" aria-busy="true">
      <span className="sr-only">Chargement de l&apos;administration</span>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader>
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-8 w-72 max-w-full" />
            <Skeleton className="h-4 w-full max-w-2xl" />
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed border-border bg-secondary p-6">
              <Skeleton className="h-4 w-full max-w-xl" />
              <Skeleton className="mt-3 h-4 w-4/5 max-w-lg" />
              <Skeleton className="mt-3 h-4 w-3/5 max-w-md" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-full max-w-xs" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-44" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            {listRows.map((row) => (
              <div key={row} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Skeleton className="h-5 w-44" />
                  <Skeleton className="h-6 w-24" />
                </div>
                <Skeleton className="mt-3 h-4 w-full max-w-xl" />
                <Skeleton className="mt-2 h-4 w-2/3 max-w-md" />
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
