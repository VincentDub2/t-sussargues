"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import type { Role } from "@/generated/prisma/client";
import {
  canEditIntervention,
  canManageInterventionWorkflow,
  generateInterventionTicketNumber,
  parsePriorityValue,
} from "@/lib/interventions";
import { prisma } from "@/lib/prisma";

export type InterventionActionState = {
  error?: string;
  success?: string;
  createdId?: string;
};

const assignableRoles: Role[] = ["agent", "responsable_service"];

function toNullableString(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : null;
}

export async function createIntervention(
  _previousState: InterventionActionState,
  formData: FormData
): Promise<InterventionActionState> {
  void _previousState;
  const session = await auth();

  if (!session?.user || !session.user.isActive || session.user.status !== "active") {
    return { error: "Session invalide. Merci de vous reconnecter." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const categoryId = toNullableString(formData.get("categoryId"));
  const serviceId = toNullableString(formData.get("serviceId"));
  const priority = parsePriorityValue(formData.get("priority")) ?? "normale";

  if (!title || !description) {
    return { error: "Le titre et la description sont obligatoires." };
  }

  const [initialStatus, category, service] = await Promise.all([
    prisma.interventionStatus.findFirst({
      where: { isActive: true },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, isFinal: true },
    }),
    categoryId
      ? prisma.interventionCategory.findUnique({
          where: { id: categoryId },
          select: { id: true },
        })
      : Promise.resolve(null),
    serviceId
      ? prisma.service.findUnique({
          where: { id: serviceId },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  if (!initialStatus) {
    return {
      error: "Aucun statut d'intervention actif n'est disponible pour creer un ticket.",
    };
  }

  if (categoryId && !category) {
    return { error: "La categorie choisie est introuvable." };
  }

  if (serviceId && !service) {
    return { error: "Le service choisi est introuvable." };
  }

  try {
    const intervention = await prisma.intervention.create({
      data: {
        ticketNumber: generateInterventionTicketNumber(),
        title,
        description,
        priority,
        statusId: initialStatus.id,
        categoryId,
        serviceId,
        requesterId: session.user.id,
        closedAt: initialStatus.isFinal ? new Date() : null,
      },
      select: { id: true, ticketNumber: true },
    });

    revalidatePath("/interventions");

    return {
      success: `Intervention ${intervention.ticketNumber} creee.`,
      createdId: intervention.id,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Creation de l'intervention impossible.",
    };
  }
}

export async function updateInterventionDetails(
  interventionId: string,
  _previousState: InterventionActionState,
  formData: FormData
): Promise<InterventionActionState> {
  void _previousState;
  const session = await auth();

  if (!session?.user || !session.user.isActive || session.user.status !== "active") {
    return { error: "Session invalide. Merci de vous reconnecter." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const categoryId = toNullableString(formData.get("categoryId"));
  const serviceId = toNullableString(formData.get("serviceId"));

  if (!title || !description) {
    return { error: "Le titre et la description sont obligatoires." };
  }

  const intervention = await prisma.intervention.findFirst({
    where: {
      id: interventionId,
    },
    select: {
      id: true,
      requesterId: true,
      assignedToId: true,
      serviceId: true,
    },
  });

  if (!intervention) {
    return { error: "Intervention introuvable." };
  }

  if (
    !canEditIntervention(
      {
        id: session.user.id,
        role: session.user.role,
        serviceId: session.user.serviceId,
      },
      intervention
    )
  ) {
    return { error: "Vous n'avez pas les droits pour modifier cette intervention." };
  }

  const [category, service] = await Promise.all([
    categoryId
      ? prisma.interventionCategory.findUnique({
          where: { id: categoryId },
          select: { id: true },
        })
      : Promise.resolve(null),
    serviceId
      ? prisma.service.findUnique({
          where: { id: serviceId },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  if (categoryId && !category) {
    return { error: "La categorie choisie est introuvable." };
  }

  if (serviceId && !service) {
    return { error: "Le service choisi est introuvable." };
  }

  try {
    await prisma.intervention.update({
      where: { id: interventionId },
      data: {
        title,
        description,
        categoryId,
        serviceId,
      },
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Mise a jour de l'intervention impossible.",
    };
  }

  revalidatePath("/interventions");
  revalidatePath(`/interventions/${interventionId}`);

  return { success: "Intervention mise a jour." };
}

export async function updateInterventionWorkflow(
  interventionId: string,
  _previousState: InterventionActionState,
  formData: FormData
): Promise<InterventionActionState> {
  void _previousState;
  const session = await auth();

  if (!session?.user || !session.user.isActive || session.user.status !== "active") {
    return { error: "Session invalide. Merci de vous reconnecter." };
  }

  const statusId = String(formData.get("statusId") ?? "").trim();
  const assignedToId = toNullableString(formData.get("assignedToId"));
  const priority = parsePriorityValue(formData.get("priority"));

  if (!statusId || !priority) {
    return { error: "Le statut et la priorite sont obligatoires." };
  }

  const intervention = await prisma.intervention.findUnique({
    where: { id: interventionId },
    select: {
      id: true,
      serviceId: true,
    },
  });

  if (!intervention) {
    return { error: "Intervention introuvable." };
  }

  if (
    !canManageInterventionWorkflow(
      {
        id: session.user.id,
        role: session.user.role,
        serviceId: session.user.serviceId,
      },
      intervention.serviceId
    )
  ) {
    return {
      error: "Seuls un administrateur ou un responsable de service peuvent piloter ce ticket.",
    };
  }

  const [status, assignee] = await Promise.all([
    prisma.interventionStatus.findUnique({
      where: { id: statusId },
      select: { id: true, isFinal: true },
    }),
    assignedToId
      ? prisma.user.findUnique({
          where: { id: assignedToId },
          select: {
            id: true,
            role: true,
            isActive: true,
            status: true,
            serviceId: true,
          },
        })
      : Promise.resolve(null),
  ]);

  if (!status) {
    return { error: "Le statut choisi est introuvable." };
  }

  if (assignedToId) {
    if (!assignee || !assignableRoles.includes(assignee.role)) {
      return { error: "L'utilisateur choisi ne peut pas etre assigne a une intervention." };
    }

    if (!assignee.isActive || assignee.status !== "active") {
      return { error: "L'utilisateur choisi n'est pas actif." };
    }

    if (
      intervention.serviceId &&
      assignee.serviceId &&
      assignee.serviceId !== intervention.serviceId
    ) {
      return {
        error: "L'agent assigne doit appartenir au meme service que l'intervention.",
      };
    }
  }

  try {
    await prisma.intervention.update({
      where: { id: interventionId },
      data: {
        statusId: status.id,
        priority,
        assignedToId,
        closedAt: status.isFinal ? new Date() : null,
      },
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Mise a jour du suivi impossible.",
    };
  }

  revalidatePath("/interventions");
  revalidatePath(`/interventions/${interventionId}`);

  return { success: "Suivi d'intervention mis a jour." };
}
