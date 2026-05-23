import { notFound } from "next/navigation";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hashPasswordResetToken } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";

type ResetPasswordPageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function ResetPasswordPage({
  params,
}: ResetPasswordPageProps) {
  const { token } = await params;

  if (!token) {
    notFound();
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: {
      tokenHash: hashPasswordResetToken(token),
    },
    include: {
      user: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  const isValid =
    resetToken &&
    !resetToken.usedAt &&
    resetToken.expiresAt >= new Date();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,var(--secondary)_0%,var(--background)_38%,var(--sand)_100%)] px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-2xl items-center">
        <Card className="w-full shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl">Reinitialisation du mot de passe</CardTitle>
            <CardDescription>
              {isValid
                ? "Choisissez un nouveau mot de passe pour votre compte."
                : "Ce lien de reinitialisation n'est plus utilisable."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {isValid && resetToken ? (
              <>
                <div className="rounded-lg border border-border bg-secondary p-4 text-sm text-foreground">
                  <p className="font-medium">
                    {resetToken.user.firstName} {resetToken.user.lastName}
                  </p>
                  <p className="mt-1 text-muted">{resetToken.user.email}</p>
                </div>
                <ResetPasswordForm token={token} />
              </>
            ) : (
              <div className="rounded-lg border border-warning/20 bg-warning/8 p-4 text-sm text-foreground">
                Le lien est invalide, expire ou deja utilise.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
