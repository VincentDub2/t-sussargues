"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { hashInvitationToken } from "@/lib/invitations";

export type AcceptInvitationActionState = {
  error?: string;
  success?: boolean;
};

export async function acceptInvitation(
  token: string,
  _previousState: AcceptInvitationActionState,
  formData: FormData
): Promise<AcceptInvitationActionState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8) {
    return { error: "Le mot de passe doit contenir au moins 8 caracteres." };
  }

  if (password !== confirmPassword) {
    return { error: "Les mots de passe ne correspondent pas." };
  }

  const tokenHash = hashInvitationToken(token);
  const invitation = await prisma.userInvitation.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      email: true,
      acceptedAt: true,
      cancelledAt: true,
      expiresAt: true,
    },
  });

  if (
    !invitation ||
    invitation.acceptedAt ||
    invitation.cancelledAt ||
    invitation.expiresAt < new Date()
  ) {
    return { error: "Ce lien d'invitation est invalide ou expire." };
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { email: invitation.email },
      data: {
        passwordHash,
        status: "active",
        isActive: true,
        emailVerifiedAt: new Date(),
      },
    });

    await tx.userInvitation.update({
      where: { id: invitation.id },
      data: {
        acceptedAt: new Date(),
      },
    });
  });

  return { success: true };
}
