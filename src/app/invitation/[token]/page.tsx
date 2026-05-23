import { notFound } from "next/navigation";

import { AcceptInvitationForm } from "@/components/invitations/accept-invitation-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hashInvitationToken } from "@/lib/invitations";
import { ROLE_LABELS } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

type InvitationPageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function InvitationPage({ params }: InvitationPageProps) {
  const { token } = await params;

  if (!token) {
    notFound();
  }

  const invitation = await prisma.userInvitation.findUnique({
    where: {
      tokenHash: hashInvitationToken(token),
    },
    include: {
      service: true,
    },
  });

  const isValid =
    invitation &&
    !invitation.acceptedAt &&
    !invitation.cancelledAt &&
    invitation.expiresAt >= new Date();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,var(--secondary)_0%,var(--background)_38%,var(--sand)_100%)] px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-2xl items-center">
        <Card className="w-full shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl">Activation du compte</CardTitle>
            <CardDescription>
              {isValid
                ? "Choisissez votre mot de passe pour finaliser l'activation."
                : "Ce lien d'invitation n'est plus utilisable."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {isValid && invitation ? (
              <>
                <div className="rounded-lg border border-border bg-secondary p-4 text-sm text-foreground">
                  <p className="font-medium">
                    {invitation.firstName} {invitation.lastName}
                  </p>
                  <p className="mt-1 text-muted">{invitation.email}</p>
                  <p className="mt-3 text-muted">
                    Role: {ROLE_LABELS[invitation.role]}
                    {invitation.service ? ` · Service: ${invitation.service.name}` : ""}
                  </p>
                </div>
                <AcceptInvitationForm token={token} />
              </>
            ) : (
              <div className="rounded-lg border border-warning/20 bg-warning/8 p-4 text-sm text-foreground">
                Le lien est invalide, expire, deja accepte ou annule.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
