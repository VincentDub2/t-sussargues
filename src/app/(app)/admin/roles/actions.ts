"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  isPermissionKey,
  isRole,
  setRolePermission,
  type PermissionKey,
} from "@/lib/permissions";

export type RolePermissionActionState = {
  error?: string;
  success?: string;
};

export async function updateRolePermissionValue({
  role,
  permission,
  enabled,
}: {
  role: string;
  permission: string;
  enabled: boolean;
}): Promise<RolePermissionActionState> {
  const session = await auth();

  if (session?.user.role !== "admin") {
    return { error: "Acces reserve a l'administration." };
  }

  if (!isRole(role) || !isPermissionKey(permission)) {
    return { error: "Droit invalide." };
  }

  if (role === "admin") {
    return {
      error: "Le role administrateur reste verrouille pour proteger l'acces global.",
    };
  }

  try {
    await setRolePermission({
      role,
      permission: permission as PermissionKey,
      enabled,
    });
  } catch (error) {
    void error;

    return { error: "Enregistrement du droit impossible." };
  }

  revalidatePath("/admin/roles");
  revalidatePath("/dashboard");
  revalidatePath("/achats");
  revalidatePath("/interventions");

  return { success: "Droit mis a jour." };
}

export async function updateRolePermission(formData: FormData): Promise<void> {
  const result = await updateRolePermissionValue({
    role: String(formData.get("role") ?? ""),
    permission: String(formData.get("permission") ?? ""),
    enabled: String(formData.get("enabled") ?? "") === "true",
  });

  if (result.error) {
    throw new Error(result.error);
  }
}

export async function updateRolePermissionState(
  _previousState: RolePermissionActionState,
  formData: FormData
): Promise<RolePermissionActionState> {
  void _previousState;

  return updateRolePermissionValue({
    role: String(formData.get("role") ?? ""),
    permission: String(formData.get("permission") ?? ""),
    enabled: String(formData.get("enabled") ?? "") === "true",
  });
}
