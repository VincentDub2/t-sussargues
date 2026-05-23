"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import type { Role } from "@/generated/prisma/client";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import {
  buildUsernameCandidate,
  isValidUsername,
  normalizeUsername,
} from "@/lib/usernames";

export type AdminUserActionState = {
  error?: string;
  success?: string;
};

const allowedRoles: Role[] = [
  "admin",
  "elu",
  "responsable_service",
  "agent",
  "lecture",
];

export async function createLocalUser(
  _previousState: AdminUserActionState,
  formData: FormData
): Promise<AdminUserActionState> {
  void _previousState;
  const session = await auth();

  if (session?.user.role !== "admin") {
    return { error: "Acces reserve a l'administration." };
  }

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const rawUsername = String(formData.get("username") ?? "").trim();
  const username =
    normalizeUsername(rawUsername) ||
    buildUsernameCandidate({ firstName, lastName });
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "") as Role;
  const rawServiceId = String(formData.get("serviceId") ?? "").trim();
  const serviceId = rawServiceId || null;

  if (!firstName || !lastName || !password || !allowedRoles.includes(role)) {
    return { error: "Veuillez remplir tous les champs obligatoires." };
  }

  if (!isValidUsername(username)) {
    return {
      error:
        "L'identifiant doit contenir 3 a 32 caracteres: lettres, chiffres, points, tirets ou underscores.",
    };
  }

  if (password.length < 8) {
    return { error: "Le mot de passe temporaire doit contenir au moins 8 caracteres." };
  }

  const existingUser = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (existingUser) {
    return { error: "Cet identifiant est deja utilise." };
  }

  const passwordHash = await hashPassword(password);

  try {
    await prisma.user.create({
      data: {
        email: null,
        username,
        firstName,
        lastName,
        role,
        status: "active",
        isActive: true,
        passwordHash,
        serviceId,
      },
    });
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Creation de l'utilisateur impossible.",
    };
  }

  revalidatePath("/admin/users");

  return { success: `Compte cree. Identifiant: ${username}` };
}

export async function updateUserAdministration(
  userId: string,
  _previousState: AdminUserActionState,
  formData: FormData
): Promise<AdminUserActionState> {
  const session = await auth();

  if (session?.user.role !== "admin") {
    return { error: "Acces reserve a l'administration." };
  }

  const role = String(formData.get("role") ?? "") as Role;
  const rawServiceId = String(formData.get("serviceId") ?? "").trim();
  const serviceId = rawServiceId || null;

  if (!allowedRoles.includes(role)) {
    return { error: "Role invalide." };
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
    },
  });

  if (!existingUser) {
    return { error: "Utilisateur introuvable." };
  }

  if (existingUser.id === session.user.id && role !== existingUser.role) {
    return { error: "Vous ne pouvez pas modifier votre propre role ici." };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        role,
        serviceId,
      },
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Mise a jour de l'utilisateur impossible.",
    };
  }

  revalidatePath("/admin/users");

  return { success: "Utilisateur mis a jour." };
}

export async function toggleUserActiveState(
  userId: string,
  _previousState: AdminUserActionState
): Promise<AdminUserActionState> {
  void _previousState;
  const session = await auth();

  if (session?.user.role !== "admin") {
    return { error: "Acces reserve a l'administration." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      isActive: true,
      status: true,
      passwordHash: true,
    },
  });

  if (!user) {
    return { error: "Utilisateur introuvable." };
  }

  if (user.id === session.user.id) {
    return { error: "Vous ne pouvez pas desactiver votre propre compte." };
  }

  const nextDisabledState = !user.isActive || user.status === "disabled";

  await prisma.user.update({
    where: { id: userId },
    data: nextDisabledState
      ? {
          isActive: Boolean(user.passwordHash),
          status: user.passwordHash ? "active" : "invited",
        }
      : {
          isActive: false,
          status: "disabled",
        },
  });

  revalidatePath("/admin/users");

  return {
    success: nextDisabledState ? "Utilisateur reactive." : "Utilisateur desactive.",
  };
}
