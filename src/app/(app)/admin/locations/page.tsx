import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CreateLocationForm } from "@/components/admin/create-location-form";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export default async function AdminLocationsPage() {
  const session = await auth();
  if (session?.user.role !== "admin") redirect("/dashboard");

  const locations = await prisma.interventionLocation.findMany({ orderBy: { name: "asc" } });

  return (
    <PageShell eyebrow="Administration" title="Lieux" description="Gestion des lieux proposes dans les tickets d'intervention.">
      <section className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card><CardHeader><CardTitle>Creer un lieu</CardTitle></CardHeader><CardContent><CreateLocationForm /></CardContent></Card>
        <Card><CardHeader><CardTitle>Lieux disponibles</CardTitle></CardHeader><CardContent className="space-y-3">
          {locations.map((l) => (
            <div key={l.id} className="rounded-lg border border-border p-4 text-sm">
              <p className="font-medium text-foreground">{l.name}</p>
              {l.description ? <p className="mt-1 text-muted">{l.description}</p> : null}
              {l.address ? <p className="mt-1 text-muted">Adresse: {l.address}</p> : null}
            </div>
          ))}
        </CardContent></Card>
      </section>
    </PageShell>
  );
}
