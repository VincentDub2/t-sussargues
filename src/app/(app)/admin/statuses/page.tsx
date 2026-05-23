import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { CreateStatusForm } from "@/components/admin/create-status-form";
import { StatusAdminCard } from "@/components/admin/status-admin-card";
import { PageShell } from "@/components/layout/page-shell";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export default async function AdminStatusesPage() {
  const session = await auth();

  if (session?.user.role !== "admin") {
    redirect("/dashboard");
  }

  const statuses = await prisma.interventionStatus.findMany({
    orderBy: [{ isActive: "desc" }, { displayOrder: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: {
          interventions: true,
        },
      },
    },
  });

  return (
    <PageShell
      eyebrow="Administration"
      title="Statuts d'intervention"
      description="Gestion des statuts, de leur ordre, de leur couleur et de leur nature finale."
    >
      <div className="flex flex-wrap justify-end gap-3">
        <Link
          href="/admin/categories"
          className={buttonVariants({ variant: "outline", className: "w-full sm:w-auto" })}
        >
          Voir les categories
        </Link>
      </div>

      <section className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Creer un statut</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateStatusForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Liste des statuts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {statuses.map((status) => (
              <StatusAdminCard
                key={status.id}
                status={{
                  id: status.id,
                  name: status.name,
                  description: status.description,
                  color: status.color,
                  isActive: status.isActive,
                  isFinal: status.isFinal,
                  displayOrder: status.displayOrder,
                  interventionsCount: status._count.interventions,
                }}
              />
            ))}
          </CardContent>
        </Card>
      </section>
    </PageShell>
  );
}
