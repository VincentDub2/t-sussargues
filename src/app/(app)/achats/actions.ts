"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import type { PurchaseStatus } from "@/generated/prisma/client";
import {
  sendPurchaseRejectedEmail,
  sendPurchaseValidatedEmail,
} from "@/lib/email";
import { createPurchaseHistoryEntry } from "@/lib/purchase-history";
import { PURCHASE_STATUS_LABELS } from "@/lib/labels";
import {
  canEditPurchaseDraft,
  canManagePurchaseWorkflow,
  generatePurchaseRequestNumber,
  getPurchaseVisibilityWhere,
  getPurchaseWorkflowTargets,
  isPurchaseClosed,
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

function formatStatusTransition(from: PurchaseStatus, to: PurchaseStatus) {
  return `${PURCHASE_STATUS_LABELS[from]} -> ${PURCHASE_STATUS_LABELS[to]}`;
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
    const purchase = await prisma.$transaction(async (tx) => {
      const createdPurchase = await tx.purchaseRequest.create({
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

      await createPurchaseHistoryEntry(tx, {
        purchaseRequestId: createdPurchase.id,
        actorId: session.user.id,
        action: "creation",
        message: `Demande ${createdPurchase.requestNumber} creee en brouillon.`,
      });

      return createdPurchase;
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
      title: true,
      description: true,
      supplier: true,
      quantity: true,
      estimatedBudget: true,
      priority: true,
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
    await prisma.$transaction(async (tx) => {
      const changes: string[] = [];

      if (purchase.title !== title) {
        changes.push("objet ajuste");
      }

      if (purchase.description !== description) {
        changes.push("description mise a jour");
      }

      if (purchase.supplier !== supplier) {
        changes.push("fournisseur mis a jour");
      }

      if (purchase.quantity !== quantity) {
        changes.push("quantite ajustee");
      }

      if ((purchase.estimatedBudget?.toString() ?? null) !== estimatedBudget) {
        changes.push("budget ajuste");
      }

      if (purchase.priority !== priority) {
        changes.push("priorite mise a jour");
      }

      if (purchase.serviceId !== serviceId) {
        changes.push("service mis a jour");
      }

      await tx.purchaseRequest.update({
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

      if (changes.length > 0) {
        await createPurchaseHistoryEntry(tx, {
          purchaseRequestId: purchaseId,
          actorId: session.user.id,
          action: "modification",
          message: `Demande modifiee: ${changes.join(", ")}.`,
        });
      }
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
    await prisma.$transaction(async (tx) => {
      await tx.purchaseRequest.update({
        where: { id: purchaseId },
        data: {
          status: "soumise",
          validationComment: null,
          validatorId: null,
        },
      });

      await createPurchaseHistoryEntry(tx, {
        purchaseRequestId: purchaseId,
        actorId: session.user.id,
        action: "soumission",
        message:
          purchase.status === "informations_demandees"
            ? "Demande mise a jour puis renvoyee pour validation."
            : "Demande soumise pour validation.",
      });
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
      requestNumber: true,
      title: true,
      requester: {
        select: {
          email: true,
          firstName: true,
        },
      },
    },
  });

  if (!purchase) {
    return { error: "Demande d'achat introuvable." };
  }

  const availableTargets = getPurchaseWorkflowTargets(purchase.status);

  if (!status || !availableTargets.some((candidate) => candidate === status)) {
    return { error: "Le statut choisi n'est pas autorise dans ce workflow." };
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

  if (isPurchaseClosed(purchase.status)) {
    return {
      error: "Une demande cloturee ne peut plus evoluer.",
    };
  }

  if (["refusee", "informations_demandees"].includes(status) && !validationComment) {
    return {
      error: "Un commentaire est obligatoire pour motiver cette decision.",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.purchaseRequest.update({
        where: { id: purchaseId },
        data: {
          status,
          validatorId: session.user.id,
          validationComment,
        },
      });

      let historyAction:
        | "validation"
        | "refus"
        | "informations_complementaires"
        | "cloture";
      let historyMessage: string;

      switch (status) {
        case "validee":
          historyAction = "validation";
          historyMessage = `Demande ${purchase.requestNumber} validee.${validationComment ? ` Commentaire: ${validationComment}` : ""}`;
          break;
        case "refusee":
          historyAction = "refus";
          historyMessage = `Demande ${purchase.requestNumber} refusee. Commentaire: ${validationComment}`;
          break;
        case "informations_demandees":
          historyAction = "informations_complementaires";
          historyMessage = `Informations complementaires demandees pour ${purchase.requestNumber}. Commentaire: ${validationComment}`;
          break;
        case "cloturee":
          historyAction = "cloture";
          historyMessage = `Demande ${purchase.requestNumber} cloturee.${validationComment ? ` Commentaire: ${validationComment}` : ""}`;
          break;
        default:
          throw new Error("Statut de workflow achat non pris en charge.");
      }

      await createPurchaseHistoryEntry(tx, {
        purchaseRequestId: purchaseId,
        actorId: session.user.id,
        action: historyAction,
        message: `${historyMessage} (${formatStatusTransition(purchase.status, status)})`,
      });
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

  if (status === "validee" && purchase.requester.email) {
    await sendPurchaseValidatedEmail({
      email: purchase.requester.email,
      firstName: purchase.requester.firstName,
      requestNumber: purchase.requestNumber,
      title: purchase.title,
      decidedByName: `${session.user.firstName} ${session.user.lastName}`.trim(),
      comment: validationComment,
    });
  }

  if (status === "refusee" && purchase.requester.email) {
    await sendPurchaseRejectedEmail({
      email: purchase.requester.email,
      firstName: purchase.requester.firstName,
      requestNumber: purchase.requestNumber,
      title: purchase.title,
      decidedByName: `${session.user.firstName} ${session.user.lastName}`.trim(),
      comment: validationComment,
    });
  }

  return {
    success:
      status === "validee"
        ? "Demande validee."
        : status === "refusee"
          ? "Demande refusee."
          : status === "informations_demandees"
            ? "Informations complementaires demandees."
            : "Demande cloturee.",
  };
}
