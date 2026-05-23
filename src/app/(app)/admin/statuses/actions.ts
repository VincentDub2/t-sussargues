"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type AdminStatusActionState = {
  error?: string;
  success?: string;
};

export async function createInterventionStatus(
  _previousState: AdminStatusActionState,
  formData: FormData
): Promise<AdminStatusActionState> {
  const session = await auth();

  if (session?.user.role !== "admin") {
    return { error: "Acces reserve a l'administration." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const color = String(formData.get("color") ?? "").trim() || null;
  const displayOrder = Number(formData.get("displayOrder") ?? 0);
  const isFinal = formData.get("isFinal") === "on";

  if (!name) {
    return { error: "Le nom du statut est obligatoire." };
  }

  try {
    await prisma.interventionStatus.create({
      data: {
        name,
        description,
        color,
        displayOrder: Number.isFinite(displayOrder) ? displayOrder : 0,
        isFinal,
      },
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Creation du statut impossible.",
    };
  }

  revalidatePath("/admin/statuses");

  return { success: "Statut cree." };
}

export async function updateInterventionStatus(
  statusId: string,
  _previousState: AdminStatusActionState,
  formData: FormData
): Promise<AdminStatusActionState> {
  const session = await auth();

  if (session?.user.role !== "admin") {
    return { error: "Acces reserve a l'administration." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const color = String(formData.get("color") ?? "").trim() || null;
  const displayOrder = Number(formData.get("displayOrder") ?? 0);
  const isFinal = formData.get("isFinal") === "on";

  if (!name) {
    return { error: "Le nom du statut est obligatoire." };
  }

  try {
    await prisma.interventionStatus.update({
      where: { id: statusId },
      data: {
        name,
        description,
        color,
        displayOrder: Number.isFinite(displayOrder) ? displayOrder : 0,
        isFinal,
      },
    });
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Mise a jour du statut impossible.",
    };
  }

  revalidatePath("/admin/statuses");

  return { success: "Statut mis a jour." };
}

export async function toggleInterventionStatus(
  statusId: string,
  _previousState: AdminStatusActionState
): Promise<AdminStatusActionState> {
  void _previousState;
  const session = await auth();

  if (session?.user.role !== "admin") {
    return { error: "Acces reserve a l'administration." };
  }

  const status = await prisma.interventionStatus.findUnique({
    where: { id: statusId },
    select: { isActive: true },
  });

  if (!status) {
    return { error: "Statut introuvable." };
  }

  await prisma.interventionStatus.update({
    where: { id: statusId },
    data: { isActive: !status.isActive },
  });

  revalidatePath("/admin/statuses");

  return {
    success: status.isActive ? "Statut desactive." : "Statut active.",
  };
}

export async function deleteInterventionStatus(
  statusId: string,
  _previousState: AdminStatusActionState
): Promise<AdminStatusActionState> {
  void _previousState;
  const session = await auth();

  if (session?.user.role !== "admin") {
    return { error: "Acces reserve a l'administration." };
  }

  const status = await prisma.interventionStatus.findUnique({
    where: { id: statusId },
    select: {
      _count: {
        select: {
          interventions: true,
        },
      },
    },
  });

  if (!status) {
    return { error: "Statut introuvable." };
  }

  if (status._count.interventions > 0) {
    return { error: "Suppression impossible: statut deja utilise." };
  }

  await prisma.interventionStatus.delete({
    where: { id: statusId },
  });

  revalidatePath("/admin/statuses");

  return { success: "Statut supprime." };
}
