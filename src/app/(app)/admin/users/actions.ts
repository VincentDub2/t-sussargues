"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import type { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

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
