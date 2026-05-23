"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  generatePurchaseRequestNumber,
  getPurchaseVisibilityWhere,
  canEditPurchaseDraft,
  canManagePurchaseWorkflow,
  parsePriorityValue,
  parsePurchaseStatusValue,
} from "@/lib/purchases";
import { prisma } from "@/lib/prisma";

export type PurchaseActionState = {
  error?: string;
  success?: string;
  createdId?: string;
};

function toNullableString(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : null;
}

function toNullableInteger(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNullableBudget(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim().replace(",", ".");
  if (!normalized) {
    return null;
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : null;
}

export async function createPurchaseRequest(
  _previousState: PurchaseActionState,
  formData: FormData
): Promise<PurchaseActionState> {
  void _previousState;
  const session = await auth();

  if (!session?.user || !session.user.isActive || session.user.status !== "active") {
    return { error: "Session invalide. Merci de vous reconnecter." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const supplier = toNullableString(formData.get("supplier"));
  const quantity = toNullableInteger(formData.get("quantity"));
  const estimatedBudget = toNullableBudget(formData.get("estimatedBudget"));
  const requestedServiceId = toNullableString(formData.get("serviceId"));
  const priority = parsePriorityValue(formData.get("priority")) ?? "normale";

  if (!title || !description) {
    return { error: "Le titre et la description sont obligatoires." };
  }

  const serviceId =
    session.user.role === "admin" || session.user.role === "responsable_service"
      ? requestedServiceId
      : session.user.serviceId;

  if (requestedServiceId && serviceId !== requestedServiceId) {
    return { error: "Vous ne pouvez pas creer une demande pour un autre service." };
  }

  if (serviceId) {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { id: true },
    });

    if (!service) {
      return { error: "Le service choisi est introuvable." };
    }
  }

  try {
    const purchase = await prisma.purchaseRequest.create({
      data: {
        requestNumber: generatePurchaseRequestNumber(),
        title,
        description,
        supplier,
        quantity,
        estimatedBudget,
        priority,
        requesterId: session.user.id,
        serviceId,
      },
      select: {
        id: true,
        requestNumber: true,
      },
    });

    revalidatePath("/achats");

    return {
      success: `Demande ${purchase.requestNumber} creee.`,
      createdId: purchase.id,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Creation de la demande d'achat impossible.",
    };
  }
}

export async function updatePurchaseDraft(
  purchaseId: string,
  _previousState: PurchaseActionState,
  formData: FormData
): Promise<PurchaseActionState> {
  void _previousState;
  const session = await auth();

  if (!session?.user || !session.user.isActive || session.user.status !== "active") {
    return { error: "Session invalide. Merci de vous reconnecter." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const supplier = toNullableString(formData.get("supplier"));
  const quantity = toNullableInteger(formData.get("quantity"));
  const estimatedBudget = toNullableBudget(formData.get("estimatedBudget"));
  const requestedServiceId = toNullableString(formData.get("serviceId"));
  const priority = parsePriorityValue(formData.get("priority")) ?? "normale";

  if (!title || !description) {
    return { error: "Le titre et la description sont obligatoires." };
  }

  const purchase = await prisma.purchaseRequest.findFirst({
    where: {
      id: purchaseId,
      AND: [
        getPurchaseVisibilityWhere({
          id: session.user.id,
          role: session.user.role,
          serviceId: session.user.serviceId,
        }),
      ],
    },
    select: {
      id: true,
      requesterId: true,
      serviceId: true,
      status: true,
    },
  });

  if (!purchase) {
    return { error: "Demande d'achat introuvable." };
  }

  if (
    !canEditPurchaseDraft(
      {
        id: session.user.id,
        role: session.user.role,
        serviceId: session.user.serviceId,
      },
      purchase
    )
  ) {
    return {
      error: "Cette demande ne peut plus etre modifiee ou ne vous appartient pas.",
    };
  }

  const serviceId =
    session.user.role === "admin" || session.user.role === "responsable_service"
      ? requestedServiceId
      : session.user.serviceId;

  if (requestedServiceId && serviceId !== requestedServiceId) {
    return { error: "Vous ne pouvez pas basculer cette demande vers un autre service." };
  }

  if (serviceId) {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { id: true },
    });

    if (!service) {
      return { error: "Le service choisi est introuvable." };
    }
  }

  try {
    await prisma.purchaseRequest.update({
      where: { id: purchaseId },
      data: {
        title,
        description,
        supplier,
        quantity,
        estimatedBudget,
        priority,
        serviceId,
      },
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Mise a jour de la demande impossible.",
    };
  }

  revalidatePath("/achats");
  revalidatePath(`/achats/${purchaseId}`);

  return { success: "Brouillon mis a jour." };
}

export async function submitPurchaseRequest(
  purchaseId: string,
  _previousState: PurchaseActionState
): Promise<PurchaseActionState> {
  void _previousState;
  const session = await auth();

  if (!session?.user || !session.user.isActive || session.user.status !== "active") {
    return { error: "Session invalide. Merci de vous reconnecter." };
  }

  const purchase = await prisma.purchaseRequest.findFirst({
    where: {
      id: purchaseId,
      AND: [
        getPurchaseVisibilityWhere({
          id: session.user.id,
          role: session.user.role,
          serviceId: session.user.serviceId,
        }),
      ],
    },
    select: {
      id: true,
      requesterId: true,
      serviceId: true,
      status: true,
    },
  });

  if (!purchase) {
    return { error: "Demande d'achat introuvable." };
  }

  if (
    !canEditPurchaseDraft(
      {
        id: session.user.id,
        role: session.user.role,
        serviceId: session.user.serviceId,
      },
      purchase
    )
  ) {
    return {
      error: "Seul le demandeur peut soumettre un brouillon encore editable.",
    };
  }

  try {
    await prisma.purchaseRequest.update({
      where: { id: purchaseId },
      data: {
        status: "soumise",
        validationComment: null,
        validatorId: null,
      },
    });
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Soumission de la demande impossible.",
    };
  }

  revalidatePath("/achats");
  revalidatePath(`/achats/${purchaseId}`);

  return { success: "Demande soumise." };
}

export async function updatePurchaseStatus(
  purchaseId: string,
  _previousState: PurchaseActionState,
  formData: FormData
): Promise<PurchaseActionState> {
  void _previousState;
  const session = await auth();

  if (!session?.user || !session.user.isActive || session.user.status !== "active") {
    return { error: "Session invalide. Merci de vous reconnecter." };
  }

  const status = parsePurchaseStatusValue(formData.get("status"));
  const validationComment = toNullableString(formData.get("validationComment"));

  if (!status || !["validee", "refusee"].includes(status)) {
    return { error: "Le statut choisi n'est pas autorise dans ce workflow." };
  }

  const purchase = await prisma.purchaseRequest.findFirst({
    where: {
      id: purchaseId,
      AND: [
        getPurchaseVisibilityWhere({
          id: session.user.id,
          role: session.user.role,
          serviceId: session.user.serviceId,
        }),
      ],
    },
    select: {
      id: true,
      serviceId: true,
      status: true,
    },
  });

  if (!purchase) {
    return { error: "Demande d'achat introuvable." };
  }

  if (
    !canManagePurchaseWorkflow(
      {
        id: session.user.id,
        role: session.user.role,
        serviceId: session.user.serviceId,
      },
      purchase.serviceId
    )
  ) {
    return {
      error: "Seuls un administrateur ou un responsable du service peuvent valider cette demande.",
    };
  }

  if (purchase.status !== "soumise") {
    return {
      error: "Seule une demande soumise peut etre validee ou refusee.",
    };
  }

  try {
    await prisma.purchaseRequest.update({
      where: { id: purchaseId },
      data: {
        status,
        validatorId: session.user.id,
        validationComment,
      },
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Mise a jour du statut impossible.",
    };
  }

  revalidatePath("/achats");
  revalidatePath(`/achats/${purchaseId}`);

  return {
    success: status === "validee" ? "Demande validee." : "Demande refusee.",
  };
}
