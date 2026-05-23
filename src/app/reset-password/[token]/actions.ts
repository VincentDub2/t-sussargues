"use server";

import { hashPassword } from "@/lib/password";
import { hashPasswordResetToken } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";

export type ResetPasswordActionState = {
  error?: string;
  success?: boolean;
};

export async function resetPassword(
  token: string,
  _previousState: ResetPasswordActionState,
  formData: FormData
): Promise<ResetPasswordActionState> {
  void _previousState;

  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8) {
    return { error: "Le mot de passe doit contenir au moins 8 caracteres." };
  }

  if (password !== confirmPassword) {
    return { error: "Les mots de passe ne correspondent pas." };
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: {
      tokenHash: hashPasswordResetToken(token),
    },
    include: {
      user: {
        select: {
          id: true,
          isActive: true,
          status: true,
        },
      },
    },
  });

  if (
    !resetToken ||
    resetToken.usedAt ||
    resetToken.expiresAt < new Date() ||
    !resetToken.user.isActive ||
    resetToken.user.status !== "active"
  ) {
    return { error: "Ce lien de reinitialisation est invalide ou expire." };
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash,
      },
    });

    await tx.passwordResetToken.update({
      where: { id: resetToken.id },
      data: {
        usedAt: new Date(),
      },
    });
  });

  return { success: true };
}
