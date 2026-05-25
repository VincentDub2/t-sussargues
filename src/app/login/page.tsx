import { LockKeyhole } from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user?.isActive && session.user.status === "active") {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,var(--secondary)_0%,var(--background)_38%,var(--sand)_100%)] px-6 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,1.1fr)_440px]">
        <section className="flex flex-col justify-between rounded-lg border border-primary-deep bg-primary-deep px-8 py-10 text-[var(--primary-foreground)] shadow-xl">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-accent">
              T-Sussargues
            </p>
            <h1 className="mt-4 max-w-lg text-4xl font-semibold leading-tight">
              Interface interne pour les interventions, les achats et les validations.
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-[color:color-mix(in_srgb,var(--primary-foreground)_78%,transparent)]">
              Cette base de connexion prepare les futurs flux securises de
              l&apos;application. Les donnees et l&apos;authentification seront
              branchees dans les prochaines etapes.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              "Interventions techniques",
              "Demandes d'achat",
              "Administration",
            ].map((item) => (
              <div
                key={item}
                className="rounded-lg border border-white/15 bg-white/8 p-4 text-sm text-[color:color-mix(in_srgb,var(--primary-foreground)_88%,transparent)]"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <div className="flex items-center">
          <Card className="w-full shadow-xl">
            <CardHeader className="space-y-3">
              <div className="flex size-11 items-center justify-center rounded-full bg-secondary text-primary">
                <LockKeyhole className="size-5" />
              </div>
              <div>
                <CardTitle className="text-2xl">Connexion</CardTitle>
                <CardDescription>
                  Connectez-vous avec le compte administrateur initialise.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <LoginForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
