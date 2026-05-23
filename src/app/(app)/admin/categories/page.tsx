import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { CategoryAdminCard } from "@/components/admin/category-admin-card";
import { CreateCategoryForm } from "@/components/admin/create-category-form";
import { PageShell } from "@/components/layout/page-shell";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export default async function AdminCategoriesPage() {
  const session = await auth();

  if (session?.user.role !== "admin") {
    redirect("/dashboard");
  }

  const categories = await prisma.interventionCategory.findMany({
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
      title="Categories d'intervention"
      description="Preparation des categories utilisees pour qualifier les interventions."
    >
      <div className="flex flex-wrap justify-end gap-3">
        <Link
          href="/admin/statuses"
          className={buttonVariants({ variant: "outline", className: "w-full sm:w-auto" })}
        >
          Voir les statuts
        </Link>
      </div>

      <section className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Creer une categorie</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateCategoryForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Liste des categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {categories.map((category) => (
              <CategoryAdminCard
                key={category.id}
                category={{
                  id: category.id,
                  name: category.name,
                  description: category.description,
                  isActive: category.isActive,
                  displayOrder: category.displayOrder,
                  interventionsCount: category._count.interventions,
                }}
              />
            ))}
          </CardContent>
        </Card>
      </section>
    </PageShell>
  );
}
