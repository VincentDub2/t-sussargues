import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const mockPurchases = [
  { title: "Pieces de maintenance", amount: "1 280 EUR", stage: "En attente" },
  { title: "EPI atelier", amount: "640 EUR", stage: "A valider" },
  { title: "Outillage terrain", amount: "2 950 EUR", stage: "Brouillon" },
] as const;

export default function AchatsPage() {
  return (
    <PageShell
      eyebrow="Module"
      title="Achats"
      description="Ecran de depart pour la gestion des demandes d'achat et des validations."
    >
      <Card>
        <CardHeader>
          <CardTitle>Demandes recentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {mockPurchases.map((item) => (
            <div
              key={item.title}
              className="grid gap-2 rounded-lg border border-border p-4 sm:grid-cols-[minmax(0,1fr)_140px_120px] sm:items-center"
            >
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-muted">
                {item.amount}
              </p>
              <p className="text-sm text-muted">{item.stage}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </PageShell>
  );
}
