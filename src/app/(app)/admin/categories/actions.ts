"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type AdminCategoryActionState = {
  error?: string;
  success?: string;
};

export async function createInterventionCategory(
  _previousState: AdminCategoryActionState,
  formData: FormData
): Promise<AdminCategoryActionState> {
  const session = await auth();

  if (session?.user.role !== "admin") {
    return { error: "Acces reserve a l'administration." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const displayOrder = Number(formData.get("displayOrder") ?? 0);

  if (!name) {
    return { error: "Le nom de la categorie est obligatoire." };
  }

  try {
    await prisma.interventionCategory.create({
      data: {
        name,
        description,
        displayOrder: Number.isFinite(displayOrder) ? displayOrder : 0,
      },
    });
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Creation de la categorie impossible.",
    };
  }

  revalidatePath("/admin/categories");

  return { success: "Categorie creee." };
}

export async function updateInterventionCategory(
  categoryId: string,
  _previousState: AdminCategoryActionState,
  formData: FormData
): Promise<AdminCategoryActionState> {
  const session = await auth();

  if (session?.user.role !== "admin") {
    return { error: "Acces reserve a l'administration." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const displayOrder = Number(formData.get("displayOrder") ?? 0);

  if (!name) {
    return { error: "Le nom de la categorie est obligatoire." };
  }

  try {
    await prisma.interventionCategory.update({
      where: { id: categoryId },
      data: {
        name,
        description,
        displayOrder: Number.isFinite(displayOrder) ? displayOrder : 0,
      },
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Mise a jour de la categorie impossible.",
    };
  }

  revalidatePath("/admin/categories");

  return { success: "Categorie mise a jour." };
}

export async function toggleInterventionCategory(
  categoryId: string,
  _previousState: AdminCategoryActionState
): Promise<AdminCategoryActionState> {
  void _previousState;
  const session = await auth();

  if (session?.user.role !== "admin") {
    return { error: "Acces reserve a l'administration." };
  }

  const category = await prisma.interventionCategory.findUnique({
    where: { id: categoryId },
    select: { isActive: true },
  });

  if (!category) {
    return { error: "Categorie introuvable." };
  }

  await prisma.interventionCategory.update({
    where: { id: categoryId },
    data: { isActive: !category.isActive },
  });

  revalidatePath("/admin/categories");

  return {
    success: category.isActive ? "Categorie desactivee." : "Categorie activee.",
  };
}

export async function deleteInterventionCategory(
  categoryId: string,
  _previousState: AdminCategoryActionState
): Promise<AdminCategoryActionState> {
  void _previousState;
  const session = await auth();

  if (session?.user.role !== "admin") {
    return { error: "Acces reserve a l'administration." };
  }

  const category = await prisma.interventionCategory.findUnique({
    where: { id: categoryId },
    select: {
      _count: {
        select: {
          interventions: true,
        },
      },
    },
  });

  if (!category) {
    return { error: "Categorie introuvable." };
  }

  if (category._count.interventions > 0) {
    return { error: "Suppression impossible: categorie deja utilisee." };
  }

  await prisma.interventionCategory.delete({
    where: { id: categoryId },
  });

  revalidatePath("/admin/categories");

  return { success: "Categorie supprimee." };
}
