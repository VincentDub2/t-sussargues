import { PageShell } from "@/components/layout/page-shell";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const mockUsers = [
  { initials: "CD", name: "Claire Durand", role: "Administratrice" },
  { initials: "ML", name: "Marc Laurent", role: "Responsable service" },
  { initials: "AS", name: "Amina Saidi", role: "Agent" },
] as const;

export default function AdminUsersPage() {
  return (
    <PageShell
      eyebrow="Administration"
      title="Utilisateurs"
      description="Point d'entree pour la gestion des comptes, des roles et des invitations."
    >
      <Card>
        <CardHeader>
          <CardTitle>Annuaire interne</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {mockUsers.map((user) => (
            <div
              key={user.name}
              className="flex items-center gap-3 rounded-lg border border-border p-4"
            >
              <Avatar className="size-11">{user.initials}</Avatar>
              <div>
                <p className="font-medium">{user.name}</p>
                <p className="text-sm text-muted">
                  {user.role}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </PageShell>
  );
}
