import { ChatOpenAI } from "@langchain/openai";
import { tool } from "langchain";
import * as z from "zod";

import type { Priority, Role } from "@/generated/prisma/client";
import { createInterventionHistoryEntry } from "@/lib/intervention-history";
import { prisma } from "@/lib/prisma";
import { getNextReferenceNumber } from "@/lib/reference-numbers";

const priorities = ["basse", "normale", "haute", "urgente"] as const;

export const interventionDraftSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(1200),
  location: z.string().min(2).max(180),
  priority: z.enum(priorities).default("normale"),
  categoryName: z.string().nullable().default(null),
  serviceName: z.string().nullable().default(null),
});

export type InterventionDraft = z.infer<typeof interventionDraftSchema>;

const prepareInterventionDraftTool = tool((input) => input, {
  name: "prepare_intervention_draft",
  description:
    "Prepare a draft intervention ticket from the user's request. This does not create anything in the database.",
  schema: interventionDraftSchema,
});

type SessionUserLike = {
  id: string;
  role: Role;
  firstName: string;
  lastName: string;
};

function getModel() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required.");
  }

  if (!process.env.OPENAI_MODEL_NAME) {
    throw new Error("OPENAI_MODEL_NAME is required.");
  }

  return new ChatOpenAI({
    model: process.env.OPENAI_MODEL_NAME,
    apiKey: process.env.OPENAI_API_KEY,
    temperature: 0,
    configuration: process.env.OPENAI_API_BASE
      ? {
          baseURL: process.env.OPENAI_API_BASE,
        }
      : undefined,
  });
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function cleanOptionalName(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function findKnownName(name: string | null | undefined, availableNames: string[]) {
  const cleanName = cleanOptionalName(name);

  if (!cleanName) {
    return null;
  }

  return (
    availableNames.find((availableName) => normalize(availableName) === normalize(cleanName)) ??
    null
  );
}

async function getInterventionContext() {
  const [categories, services, locations] = await Promise.all([
    prisma.interventionCategory.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: { name: true },
    }),
    prisma.service.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { name: true },
    }),
    prisma.interventionLocation.findMany({
      orderBy: { name: "asc" },
      select: { name: true },
    }),
  ]);

  return {
    priorities,
    categories: categories.map((category) => category.name),
    services: services.map((service) => service.name),
    locations: locations.map((location) => location.name),
  };
}

async function findActiveCategory(categoryName?: string | null) {
  const name = cleanOptionalName(categoryName);

  if (!name) {
    return null;
  }

  const categories = await prisma.interventionCategory.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  const category = categories.find((item) => normalize(item.name) === normalize(name));

  if (!category) {
    throw new Error(`La categorie "${name}" est introuvable ou inactive.`);
  }

  return category;
}

async function findActiveService(serviceName?: string | null) {
  const name = cleanOptionalName(serviceName);

  if (!name) {
    return null;
  }

  const services = await prisma.service.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  const service = services.find((item) => normalize(item.name) === normalize(name));

  if (!service) {
    throw new Error(`Le service "${name}" est introuvable ou inactif.`);
  }

  return service;
}

export async function buildInterventionDraft(message: string) {
  const context = await getInterventionContext();
  const model = getModel().bindTools([prepareInterventionDraftTool], {
    tool_choice: {
      type: "function",
      function: {
        name: "prepare_intervention_draft",
      },
    },
    parallel_tool_calls: false,
  });

  const response = await model.invoke([
    {
      role: "system",
      content: [
        "You prepare intervention tickets for the Sussargues city hall.",
        "Extract one intervention draft from the user message.",
        "Use French for title and description.",
        "Use only these priorities: basse, normale, haute, urgente.",
        "The location field can be free text.",
        "Do not replace a specific user location with a different available location.",
        "Use an available location only when it clearly refers to the same place mentioned by the user.",
        "Only set categoryName and serviceName when they exactly match one available value.",
        "If category or service is unclear, return null for it.",
        "Call the prepare_intervention_draft tool exactly once.",
        `Available context: ${JSON.stringify(context)}`,
      ].join("\n"),
    },
    {
      role: "user",
      content: message,
    },
  ]);
  const draftToolCall = response.tool_calls?.find(
    (toolCall) => toolCall.name === "prepare_intervention_draft"
  );

  if (!draftToolCall) {
    throw new Error("L'assistant n'a pas prepare de brouillon d'intervention.");
  }

  const draft = interventionDraftSchema.parse(draftToolCall.args);

  return {
    ...draft,
    categoryName: findKnownName(draft.categoryName, context.categories),
    serviceName: findKnownName(draft.serviceName, context.services),
  };
}

export async function createInterventionFromDraft(
  user: SessionUserLike,
  draftInput: InterventionDraft
) {
  const draft = interventionDraftSchema.parse(draftInput);
  const [initialStatus, category, service] = await Promise.all([
    prisma.interventionStatus.findFirst({
      where: { isActive: true },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, isFinal: true },
    }),
    findActiveCategory(draft.categoryName),
    findActiveService(draft.serviceName),
  ]);

  if (!initialStatus) {
    throw new Error("Aucun statut actif n'est disponible pour creer un ticket.");
  }

  const intervention = await prisma.$transaction(async (tx) => {
    const ticketNumber = await getNextReferenceNumber(tx, {
      scope: "intervention",
      prefix: "INT",
    });

    const created = await tx.intervention.create({
      data: {
        ticketNumber,
        title: draft.title,
        description: draft.description,
        location: draft.location,
        priority: draft.priority as Priority,
        statusId: initialStatus.id,
        categoryId: category?.id ?? null,
        serviceId: service?.id ?? null,
        requesterId: user.id,
        closedAt: initialStatus.isFinal ? new Date() : null,
      },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        priority: true,
        location: true,
        createdAt: true,
      },
    });

    await createInterventionHistoryEntry(tx, {
      interventionId: created.id,
      actorId: user.id,
      action: "creation",
      message: "Intervention creee depuis l'assistant.",
    });

    return created;
  });

  return {
    id: intervention.id,
    ticketNumber: intervention.ticketNumber,
    title: intervention.title,
    priority: intervention.priority,
    location: intervention.location,
    status: initialStatus.name,
    category: category?.name ?? null,
    service: service?.name ?? null,
    requester: `${user.firstName} ${user.lastName}`.trim(),
    createdAt: intervention.createdAt.toISOString(),
  };
}
