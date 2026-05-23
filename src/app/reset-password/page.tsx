import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { RequestPasswordResetForm } from "@/components/auth/request-password-reset-form";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ResetPasswordRequestPage() {
  const session = await auth();

  if (session?.user?.isActive && session.user.status === "active") {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,var(--secondary)_0%,var(--background)_38%,var(--sand)_100%)] px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-2xl items-center">
        <Card className="w-full shadow-xl">
          <CardHeader className="space-y-3">
            <div className="flex size-11 items-center justify-center rounded-full bg-secondary text-primary">
              <Mail className="size-5" />
            </div>
            <div>
              <CardTitle className="text-2xl">Mot de passe oublie</CardTitle>
              <CardDescription>
                Saisissez votre email pour recevoir un lien de reinitialisation.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <RequestPasswordResetForm />
            <Link
              href="/login"
              className={buttonVariants({ variant: "outline", className: "w-full" })}
            >
              <ArrowLeft />
              Retour a la connexion
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
