import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
};

export function PageShell({
  eyebrow,
  title,
  description,
  children,
}: PageShellProps) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader>
            <p className="text-xs uppercase tracking-[0.24em] text-muted">{eyebrow}</p>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed border-border bg-secondary p-6 text-sm leading-6 text-muted">
              Contenu a venir. Cette page est en place pour l&apos;etape 1 et sera
              connectee aux donnees dans les prochaines etapes.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prochaine suite</CardTitle>
            <CardDescription>
              La navigation est operationnelle et le shell d&apos;application est
              pret pour accueillir les modules.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted">
            <p>Les composants UI de base sont maintenant disponibles.</p>
            <p>Les pages existent sans connexion aux donnees.</p>
            <p>Le layout commun servira aux futurs ecrans proteges.</p>
          </CardContent>
        </Card>
      </section>

      {children}
    </div>
  );
}
