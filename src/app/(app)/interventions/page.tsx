import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const mockInterventions = [
  { reference: "INT-2026-014", status: "Urgente", service: "Electricite" },
  { reference: "INT-2026-011", status: "Planifiee", service: "Climatisation" },
  { reference: "INT-2026-008", status: "Nouveau", service: "Batiment" },
] as const;

export default function InterventionsPage() {
  return (
    <PageShell
      eyebrow="Module"
      title="Interventions"
      description="Base d'ecran pour la future gestion des interventions, du tri et des priorites."
    >
      <Card>
        <CardHeader>
          <CardTitle>Liste de travail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {mockInterventions.map((item) => (
            <div
              key={item.reference}
              className="flex flex-col gap-2 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{item.reference}</p>
                <p className="text-sm text-muted">
                  {item.service}
                </p>
              </div>
              <Badge variant="outline">{item.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </PageShell>
  );
}
