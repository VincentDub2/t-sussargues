"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import type { Role } from "@/generated/prisma/client";
import {
  sendInterventionAssignedEmail,
  sendInterventionCreatedEmail,
} from "@/lib/email";
import {
  createInterventionHistoryEntry,
  formatNullableLabel,
  formatPriorityLabel,
} from "@/lib/intervention-history";
import { parseInterventionLocation } from "@/lib/intervention-locations";
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
  const location = parseInterventionLocation(formData);
  const categoryId = toNullableString(formData.get("categoryId"));
  const serviceId = toNullableString(formData.get("serviceId"));
  const priority = parsePriorityValue(formData.get("priority")) ?? "normale";

  if (!title || !description || !location) {
    return { error: "Le titre, la description et le lieu sont obligatoires." };
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
    const intervention = await prisma.$transaction(async (tx) => {
      const created = await tx.intervention.create({
        data: {
          ticketNumber: generateInterventionTicketNumber(),
          title,
          description,
          location,
          priority,
          statusId: initialStatus.id,
          categoryId,
          serviceId,
          requesterId: session.user.id,
          closedAt: initialStatus.isFinal ? new Date() : null,
        },
        select: { id: true, ticketNumber: true },
      });

      await createInterventionHistoryEntry(tx, {
        interventionId: created.id,
        actorId: session.user.id,
        action: "creation",
        message: `Intervention creee avec le statut initial et la priorite ${formatPriorityLabel(
          priority
        ).toLowerCase()}.`,
      });

      return created;
    });

    revalidatePath("/interventions");

    if (session.user.email) {
      await sendInterventionCreatedEmail({
        email: session.user.email,
        firstName: session.user.firstName,
        ticketNumber: intervention.ticketNumber,
        title,
      });
    }

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
  const location = parseInterventionLocation(formData);
  const categoryId = toNullableString(formData.get("categoryId"));
  const serviceId = toNullableString(formData.get("serviceId"));

  if (!title || !description || !location) {
    return { error: "Le titre, la description et le lieu sont obligatoires." };
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
      title: true,
      description: true,
      location: true,
      category: {
        select: {
          name: true,
        },
      },
      service: {
        select: {
          name: true,
        },
      },
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
          select: { id: true, name: true },
        })
      : Promise.resolve(null),
    serviceId
      ? prisma.service.findUnique({
          where: { id: serviceId },
          select: { id: true, name: true },
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
    await prisma.$transaction(async (tx) => {
      await tx.intervention.update({
        where: { id: interventionId },
        data: {
          title,
          description,
          location,
          categoryId,
          serviceId,
        },
      });

      const historyMessages: string[] = [];

      if (intervention.title !== title) {
        historyMessages.push(`Titre mis a jour: "${intervention.title}" -> "${title}".`);
      }

      if (intervention.description !== description) {
        historyMessages.push("Description mise a jour.");
      }

      if ((intervention.location ?? null) !== location) {
        historyMessages.push(
          `Lieu modifie: ${formatNullableLabel(
            intervention.location ?? null
          )} -> ${formatNullableLabel(location)}.`
        );
      }

      const currentCategoryName = intervention.category?.name ?? null;
      const updatedCategoryName = category?.name ?? null;

      if (currentCategoryName !== updatedCategoryName) {
        historyMessages.push(
          `Categorie modifiee: ${formatNullableLabel(
            currentCategoryName
          )} -> ${formatNullableLabel(updatedCategoryName)}.`
        );
      }

      const currentServiceName = intervention.service?.name ?? null;
      const updatedServiceName = service?.name ?? null;

      if (currentServiceName !== updatedServiceName) {
        historyMessages.push(
          `Service modifie: ${formatNullableLabel(currentServiceName)} -> ${formatNullableLabel(
            updatedServiceName
          )}.`
        );
      }

      if (historyMessages.length === 0) {
        historyMessages.push("Fiche intervention enregistree sans changement structurel visible.");
      }

      await Promise.all(
        historyMessages.map((message) =>
          createInterventionHistoryEntry(tx, {
            interventionId,
            actorId: session.user.id,
            action: "modification",
            message,
          })
        )
      );
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
      ticketNumber: true,
      title: true,
      serviceId: true,
      priority: true,
      assignedToId: true,
      status: {
        select: {
          name: true,
        },
      },
      assignedTo: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
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
      select: { id: true, isFinal: true, name: true },
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
          firstName: true,
          lastName: true,
          email: true,
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
    await prisma.$transaction(async (tx) => {
      await tx.intervention.update({
        where: { id: interventionId },
        data: {
          statusId: status.id,
          priority,
          assignedToId,
          closedAt: status.isFinal ? new Date() : null,
        },
      });

      const historyEntries: Array<{
        action: "statut" | "affectation";
        message: string;
      }> = [];

      if (intervention.status.name !== status.name) {
        historyEntries.push({
          action: "statut",
          message: `Statut modifie: ${intervention.status.name} -> ${status.name}.`,
        });
      }

      if (intervention.priority !== priority) {
        historyEntries.push({
          action: "statut",
          message: `Priorite modifiee: ${formatPriorityLabel(
            intervention.priority
          )} -> ${formatPriorityLabel(priority)}.`,
        });
      }

      const previousAssigneeName = intervention.assignedTo
        ? `${intervention.assignedTo.firstName} ${intervention.assignedTo.lastName}`.trim()
        : null;
      const nextAssigneeName = assignee
        ? `${assignee.firstName} ${assignee.lastName}`.trim()
        : null;

      if ((intervention.assignedToId ?? null) !== (assignedToId ?? null)) {
        historyEntries.push({
          action: "affectation",
          message: `Affectation modifiee: ${formatNullableLabel(
            previousAssigneeName
          )} -> ${formatNullableLabel(nextAssigneeName)}.`,
        });
      }

      if (historyEntries.length === 0) {
        historyEntries.push({
          action: "statut",
          message: "Pilotage revalide sans changement visible.",
        });
      }

      await Promise.all(
        historyEntries.map((entry) =>
          createInterventionHistoryEntry(tx, {
            interventionId,
            actorId: session.user.id,
            action: entry.action,
            message: entry.message,
          })
        )
      );
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

  if (
    assignee?.email &&
    (intervention.assignedToId ?? null) !== (assignedToId ?? null)
  ) {
    await sendInterventionAssignedEmail({
      email: assignee.email,
      firstName: assignee.firstName,
      ticketNumber: intervention.ticketNumber,
      title: intervention.title,
      assignedByName: `${session.user.firstName} ${session.user.lastName}`.trim(),
    });
  }

  return { success: "Suivi d'intervention mis a jour." };
}
