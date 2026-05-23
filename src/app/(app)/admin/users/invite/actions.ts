"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import type { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  generateInvitationToken,
  getInvitationExpiryDate,
  getInvitationUrl,
} from "@/lib/invitations";
import { sendInvitationEmail } from "@/lib/email";
import { buildUsernameCandidate, normalizeUsername } from "@/lib/usernames";

export type InvitationActionState = {
  error?: string;
  errorDetails?: string;
  success?: boolean;
  email?: string;
  previewUrl?: string;
  deliveryStatus?: "sent" | "dev_preview" | "disabled" | "skipped_no_recipient";
};

const allowedRoles: Role[] = [
  "admin",
  "elu",
  "responsable_service",
  "agent",
  "lecture",
];

async function resolveAvailableUsername(candidate: string) {
  const base = normalizeUsername(candidate) || "utilisateur";
  let username = base;
  let suffix = 2;

  while (await prisma.user.findUnique({ where: { username }, select: { id: true } })) {
    username = `${base}${suffix}`;
    suffix += 1;
  }

  return username;
}

export async function createInvitation(
  _previousState: InvitationActionState,
  formData: FormData
): Promise<InvitationActionState> {
  const session = await auth();

  if (session?.user.role !== "admin") {
    return { error: "Acces reserve a l'administration." };
  }

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "") as Role;
  const rawServiceId = String(formData.get("serviceId") ?? "").trim();
  const serviceId = rawServiceId || null;

  if (!firstName || !lastName || !email || !allowedRoles.includes(role)) {
    return { error: "Veuillez remplir tous les champs obligatoires." };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      username: true,
      status: true,
      isActive: true,
    },
  });

  if (existingUser?.status === "active" && existingUser.isActive) {
    return { error: "Un compte actif existe deja pour cet email." };
  }

  if (existingUser?.status === "disabled") {
    return { error: "Ce compte est desactive. Reactivez-le avant de renvoyer une invitation." };
  }

  const inviterName =
    session.user.name ?? `${session.user.firstName} ${session.user.lastName}`;
  const { token, tokenHash } = generateInvitationToken();
  const invitationUrl = getInvitationUrl(token);
  const expiresAt = getInvitationExpiryDate();
  const username =
    existingUser?.username ??
    (await resolveAvailableUsername(buildUsernameCandidate({ firstName, lastName, email })));

  await prisma.$transaction(async (tx) => {
    await tx.userInvitation.updateMany({
      where: {
        email,
        acceptedAt: null,
        cancelledAt: null,
      },
      data: {
        cancelledAt: new Date(),
      },
    });

    await tx.user.upsert({
      where: { email },
      update: {
        firstName,
        lastName,
        username,
        role,
        status: "invited",
        isActive: false,
        passwordHash: null,
        serviceId,
      },
      create: {
        email,
        username,
        firstName,
        lastName,
        role,
        status: "invited",
        isActive: false,
        serviceId,
      },
    });

    await tx.userInvitation.create({
      data: {
        email,
        firstName,
        lastName,
        tokenHash,
        role,
        serviceId,
        invitedById: session.user.id,
        expiresAt,
      },
    });
  });

  try {
    const delivery = await sendInvitationEmail({
      email,
      firstName,
      invitedByName: inviterName,
      invitationUrl,
    });

    if (delivery.status === "failed") {
      return {
        error: "Invitation creee, mais l'email n'a pas pu etre envoye.",
        errorDetails: delivery.errorMessage,
      };
    }

    revalidatePath("/admin/users");
    revalidatePath("/admin/users/invite");

    return {
      success: true,
      email,
      deliveryStatus: delivery.status,
      previewUrl: delivery.status === "dev_preview" ? delivery.previewUrl : undefined,
    };
  } catch (error) {
    return {
      error: "Invitation creee, mais l'email n'a pas pu etre envoye.",
      errorDetails:
        error instanceof Error ? error.message : "Envoi de l'email impossible.",
    };
  }
}
