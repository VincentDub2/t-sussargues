import { BarChart3, ClipboardList, ShoppingCart, Users } from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const previewStats = [
  { label: "Interventions ouvertes", value: "18", icon: ClipboardList },
  { label: "Demandes d'achat", value: "7", icon: ShoppingCart },
  { label: "Utilisateurs actifs", value: "24", icon: Users },
  { label: "Suivi global", value: "92%", icon: BarChart3 },
] as const;

export default function DashboardPage() {
  return (
    <PageShell
      eyebrow="Vue generale"
      title="Dashboard"
      description="Point d'entree de l'application pour les indicateurs, les files de travail et les prochaines actions."
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {previewStats.map((item) => (
          <Card key={item.label}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted">
                {item.label}
              </CardTitle>
              <item.icon className="size-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{item.value}</div>
            </CardContent>
          </Card>
        ))}
      </section>
    </PageShell>
  );
}
