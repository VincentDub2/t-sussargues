"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type AdminServiceActionState = {
  error?: string;
  success?: string;
};

export async function createService(
  _previousState: AdminServiceActionState,
  formData: FormData
): Promise<AdminServiceActionState> {
  const session = await auth();

  if (session?.user.role !== "admin") {
    return { error: "Acces reserve a l'administration." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!name) {
    return { error: "Le nom du service est obligatoire." };
  }

  try {
    await prisma.service.create({
      data: {
        name,
        description,
      },
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Creation du service impossible.",
    };
  }

  revalidatePath("/admin/services");

  return { success: "Service cree." };
}

export async function updateService(
  serviceId: string,
  _previousState: AdminServiceActionState,
  formData: FormData
): Promise<AdminServiceActionState> {
  const session = await auth();

  if (session?.user.role !== "admin") {
    return { error: "Acces reserve a l'administration." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!name) {
    return { error: "Le nom du service est obligatoire." };
  }

  try {
    await prisma.service.update({
      where: { id: serviceId },
      data: {
        name,
        description,
      },
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Mise a jour du service impossible.",
    };
  }

  revalidatePath("/admin/services");
  revalidatePath("/admin/users");

  return { success: "Service mis a jour." };
}

export async function toggleServiceActiveState(
  serviceId: string,
  _previousState: AdminServiceActionState
): Promise<AdminServiceActionState> {
  void _previousState;
  const session = await auth();

  if (session?.user.role !== "admin") {
    return { error: "Acces reserve a l'administration." };
  }

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: {
      id: true,
      isActive: true,
    },
  });

  if (!service) {
    return { error: "Service introuvable." };
  }

  await prisma.service.update({
    where: { id: serviceId },
    data: {
      isActive: !service.isActive,
    },
  });

  revalidatePath("/admin/services");
  revalidatePath("/admin/users");

  return {
    success: service.isActive ? "Service desactive." : "Service active.",
  };
}
