"use server";

import { prisma } from "@/lib/prisma";
import {
  generatePasswordResetToken,
  getPasswordResetExpiryDate,
  getPasswordResetUrl,
} from "@/lib/password-reset";
import { sendPasswordResetEmail } from "@/lib/email";

export type RequestPasswordResetActionState = {
  error?: string;
  success?: string;
  previewUrl?: string;
};

const GENERIC_SUCCESS_MESSAGE =
  "Si un compte actif correspond a cet email, un lien de reinitialisation a ete prepare.";

export async function requestPasswordReset(
  _previousState: RequestPasswordResetActionState,
  formData: FormData
): Promise<RequestPasswordResetActionState> {
  void _previousState;

  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    return { error: "Veuillez renseigner votre email." };
  }

  const user = await prisma.user.findFirst({
    where: { email },
    select: {
      id: true,
      email: true,
      firstName: true,
      status: true,
      isActive: true,
      passwordHash: true,
    },
  });

  if (!user?.passwordHash || !user.isActive || user.status !== "active") {
    return { success: GENERIC_SUCCESS_MESSAGE };
  }

  const { token, tokenHash } = generatePasswordResetToken();
  const resetUrl = getPasswordResetUrl(token);
  const expiresAt = getPasswordResetExpiryDate();

  await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    await tx.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });
  });

  if (!user.email) {
    return { success: GENERIC_SUCCESS_MESSAGE };
  }

  const delivery = await sendPasswordResetEmail({
    email: user.email,
    firstName: user.firstName,
    resetUrl,
  });

  return {
    success:
      delivery.status === "failed"
        ? "La demande a ete prise en compte, mais l'email n'a pas pu etre envoye. Consultez les logs."
        : GENERIC_SUCCESS_MESSAGE,
    previewUrl: delivery.status === "dev_preview" ? delivery.previewUrl : undefined,
  };
}
