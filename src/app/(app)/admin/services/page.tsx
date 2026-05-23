import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { CreateServiceForm } from "@/components/admin/create-service-form";
import { ServiceAdminCard } from "@/components/admin/service-admin-card";
import { PageShell } from "@/components/layout/page-shell";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export default async function AdminServicesPage() {
  const session = await auth();

  if (session?.user.role !== "admin") {
    redirect("/dashboard");
  }

  const services = await prisma.service.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: {
      _count: {
        select: {
          users: true,
        },
      },
    },
  });

  return (
    <PageShell
      eyebrow="Administration"
      title="Services"
      description="Gestion des services municipaux rattaches aux utilisateurs et aux demandes."
    >
      <div className="flex flex-wrap justify-end gap-3">
        <Link
          href="/admin/users"
          className={buttonVariants({ variant: "outline", className: "w-full sm:w-auto" })}
        >
          Voir les utilisateurs
        </Link>
      </div>

      <section className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Creer un service</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateServiceForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Liste des services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {services.map((service) => (
              <ServiceAdminCard
                key={service.id}
                service={{
                  id: service.id,
                  name: service.name,
                  description: service.description,
                  isActive: service.isActive,
                  usersCount: service._count.users,
                }}
              />
            ))}
          </CardContent>
        </Card>
      </section>
    </PageShell>
  );
}
