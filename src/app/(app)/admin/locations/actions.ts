"use server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type AdminLocationActionState = { error?: string; success?: string };

export async function createInterventionLocation(_p: AdminLocationActionState, formData: FormData): Promise<AdminLocationActionState> {
  const session = await auth();
  if (session?.user.role !== "admin") return { error: "Acces reserve a l'administration." };
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;
  if (!name) return { error: "Le nom du lieu est obligatoire." };
  try {
    await prisma.interventionLocation.create({ data: { name, description, address } });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Creation du lieu impossible." };
  }
  revalidatePath("/admin/locations");
  revalidatePath("/interventions");
  return { success: "Lieu cree." };
}
