import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
import { createAgent, tool } from "langchain";
import * as z from "zod";

import type { Priority, Role } from "@/generated/prisma/client";
import {
  createInterventionHistoryEntry,
  formatNullableLabel,
  formatPriorityLabel,
} from "@/lib/intervention-history";
import { PRIORITY_LABELS } from "@/lib/labels";
import {
  canEditIntervention,
  canManageInterventionWorkflow,
  getInterventionVisibilityWhere,
} from "@/lib/interventions";
import type { PermissionSet } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getNextReferenceNumber } from "@/lib/reference-numbers";

const priorities = ["basse", "normale", "haute", "urgente"] as const;
const interventionCheckpointer = new MemorySaver();

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
  serviceId: string | null;
  firstName: string;
  lastName: string;
  permissions?: PermissionSet;
};

type InterventionAgentResponse = {
  reply: string;
  draft?: InterventionDraft;
  intervention?: {
    id: string;
    ticketNumber: string;
    title: string;
  };
};

const interventionReferenceSchema = z.object({
  reference: z
    .string()
    .min(2)
    .max(80)
    .describe("Intervention id or ticket number, for example INT-2026-0001."),
});

const interventionSearchSchema = z.object({
  query: z
    .string()
    .min(2)
    .max(240)
    .describe("Natural language search query for an existing intervention."),
  limit: z.number().int().min(1).max(10).default(5),
});

const interventionUpdateSchema = interventionReferenceSchema
  .extend({
    title: z.string().min(3).max(120).optional(),
    description: z.string().min(10).max(1200).optional(),
    location: z.string().min(2).max(180).optional(),
    categoryName: z.string().nullable().optional(),
    serviceName: z.string().nullable().optional(),
  })
  .refine(
    (input) =>
      ["title", "description", "location", "categoryName", "serviceName"].some(
        (key) => Object.hasOwn(input, key)
      ),
    {
      message: "Au moins un champ doit etre fourni pour mettre a jour l'intervention.",
    }
  );

const interventionWorkflowSchema = interventionReferenceSchema
  .extend({
    statusName: z.string().min(2).max(120).optional(),
    priority: z.enum(priorities).optional(),
    assignedToName: z.string().nullable().optional(),
  })
  .refine(
    (input) =>
      ["statusName", "priority", "assignedToName"].some((key) =>
        Object.hasOwn(input, key)
      ),
    {
      message: "Au moins un champ de suivi doit etre fourni.",
    }
  );

const interventionCompletenessSchema = z
  .object({
    reference: z.string().min(2).max(80).optional(),
    draft: interventionDraftSchema.partial().optional(),
  })
  .refine((input) => input.reference || input.draft, {
    message: "Indiquez une intervention existante ou un brouillon a verifier.",
  });

const resetInterventionDraftSchema = z.object({
  reason: z.string().max(200).nullable().default(null),
});

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
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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

async function findActiveStatus(statusName: string) {
  const statuses = await prisma.interventionStatus.findMany({
    where: { isActive: true },
    select: { id: true, name: true, isFinal: true },
  });

  return (
    statuses.find((status) => normalize(status.name) === normalize(statusName)) ?? null
  );
}

function tokenize(value: string) {
  return normalize(value)
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function isSubsequence(needle: string, haystack: string) {
  let position = 0;

  for (const char of haystack) {
    if (char === needle[position]) {
      position += 1;
    }

    if (position === needle.length) {
      return true;
    }
  }

  return false;
}

function scoreSearchField(
  query: string,
  queryTokens: string[],
  value: string | null | undefined,
  weight: number
) {
  const normalizedValue = normalize(value ?? "");

  if (!normalizedValue) {
    return 0;
  }

  if (normalizedValue === query) {
    return 12 * weight;
  }

  if (normalizedValue.includes(query)) {
    return 8 * weight;
  }

  return queryTokens.reduce((score, token) => {
    if (normalizedValue.includes(token)) {
      return score + 3 * weight;
    }

    if (token.length >= 3 && isSubsequence(token, normalizedValue)) {
      return score + weight;
    }

    return score;
  }, 0);
}

function extractTicketNumber(value: string) {
  const match = value.match(/\bINT[\s-]*(\d{4})[\s-]*(\d{1,6})\b/i);

  if (!match) {
    return null;
  }

  return `INT-${match[1]}-${match[2].padStart(4, "0")}`;
}

function formatSearchDate(date: Date | null) {
  if (!date) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

async function findVisibleIntervention(user: SessionUserLike, reference: string) {
  const normalizedReference = reference.trim();

  if (!normalizedReference) {
    throw new Error("Indiquez le numero ou l'identifiant de l'intervention.");
  }

  const intervention = await prisma.intervention.findFirst({
    where: {
      OR: [
        { id: normalizedReference },
        { ticketNumber: normalizedReference },
        { ticketNumber: normalizedReference.toUpperCase() },
      ],
      AND: [
        getInterventionVisibilityWhere({
          id: user.id,
          role: user.role,
          serviceId: user.serviceId,
          permissions: user.permissions,
        }),
      ],
    },
    select: {
      id: true,
      ticketNumber: true,
      title: true,
      description: true,
      location: true,
      priority: true,
      requesterId: true,
      serviceId: true,
      assignedToId: true,
      createdAt: true,
      updatedAt: true,
      closedAt: true,
      status: { select: { id: true, name: true, isFinal: true } },
      category: { select: { name: true } },
      service: { select: { name: true } },
      requester: { select: { firstName: true, lastName: true, email: true } },
      assignedTo: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  if (!intervention) {
    throw new Error("Intervention introuvable ou hors de votre perimetre.");
  }

  return intervention;
}

function validateInterventionFields(input: {
  title?: string | null;
  description?: string | null;
  location?: string | null;
}) {
  const missing: string[] = [];

  if (!input.title?.trim()) {
    missing.push("titre");
  }

  if (!input.description?.trim()) {
    missing.push("description");
  }

  if (!input.location?.trim()) {
    missing.push("lieu");
  }

  return {
    isComplete: missing.length === 0,
    missing,
    nextQuestion:
      missing.length > 0
        ? `Pouvez-vous preciser ${missing.length === 1 ? "le" : "les"} ${missing.join(
            ", "
          )} ?`
        : null,
  };
}

function summarizeIntervention(
  user: SessionUserLike,
  intervention: Awaited<ReturnType<typeof findVisibleIntervention>>
) {
  return {
    id: intervention.id,
    ticketNumber: intervention.ticketNumber,
    title: intervention.title,
    description: intervention.description,
    location: intervention.location,
    priority: intervention.priority,
    priorityLabel: PRIORITY_LABELS[intervention.priority],
    status: intervention.status.name,
    isFinalStatus: intervention.status.isFinal,
    category: intervention.category?.name ?? null,
    service: intervention.service?.name ?? null,
    requester: `${intervention.requester.firstName} ${intervention.requester.lastName}`.trim(),
    requesterEmail: intervention.requester.email,
    assignedTo: intervention.assignedTo
      ? `${intervention.assignedTo.firstName} ${intervention.assignedTo.lastName}`.trim()
      : null,
    assignedToEmail: intervention.assignedTo?.email ?? null,
    createdAt: intervention.createdAt.toISOString(),
    updatedAt: intervention.updatedAt.toISOString(),
    closedAt: intervention.closedAt?.toISOString() ?? null,
    completeness: validateInterventionFields(intervention),
    availableActions: {
      canUpdate: canEditIntervention(
        {
          id: user.id,
          role: user.role,
          serviceId: user.serviceId,
          permissions: user.permissions,
        },
        intervention
      ),
      canManageWorkflow: canManageInterventionWorkflow(
        {
          id: user.id,
          role: user.role,
          serviceId: user.serviceId,
          permissions: user.permissions,
        },
        intervention.serviceId
      ),
    },
  };
}

async function getInterventionDetails(user: SessionUserLike, reference: string) {
  const intervention = await findVisibleIntervention(user, reference);

  return summarizeIntervention(user, intervention);
}

async function searchInterventions(
  user: SessionUserLike,
  input: z.infer<typeof interventionSearchSchema>
) {
  const query = normalize(input.query);
  const queryTokens = tokenize(input.query);
  const visibilityWhere = getInterventionVisibilityWhere({
    id: user.id,
    role: user.role,
    serviceId: user.serviceId,
    permissions: user.permissions,
  });

  if (!query || queryTokens.length === 0) {
    throw new Error("Indiquez quelques mots pour rechercher une intervention.");
  }

  const toSearchResult = (intervention: {
    id: string;
    ticketNumber: string;
    title: string;
    description: string;
    location: string | null;
    priority: Priority;
    createdAt: Date;
    updatedAt: Date;
    closedAt: Date | null;
    status: { name: string; isFinal: boolean };
    category: { name: string } | null;
    service: { name: string } | null;
    requester: { firstName: string; lastName: string; email: string | null };
    assignedTo: { firstName: string; lastName: string; email: string | null } | null;
  }) => {
    const requesterName =
      `${intervention.requester.firstName} ${intervention.requester.lastName}`.trim();
    const assigneeName = intervention.assignedTo
      ? `${intervention.assignedTo.firstName} ${intervention.assignedTo.lastName}`.trim()
      : null;

    return {
      id: intervention.id,
      ticketNumber: intervention.ticketNumber,
      title: intervention.title,
      description: intervention.description,
      location: intervention.location,
      priority: intervention.priority,
      priorityLabel: PRIORITY_LABELS[intervention.priority],
      status: intervention.status.name,
      isFinalStatus: intervention.status.isFinal,
      category: intervention.category?.name ?? null,
      service: intervention.service?.name ?? null,
      requester: requesterName,
      assignedTo: assigneeName,
      createdAt: intervention.createdAt.toISOString(),
      updatedAt: intervention.updatedAt.toISOString(),
      closedAt: intervention.closedAt?.toISOString() ?? null,
    };
  };

  const exactTicketNumber = extractTicketNumber(input.query);

  if (exactTicketNumber) {
    const intervention = await prisma.intervention.findFirst({
      where: {
        ticketNumber: exactTicketNumber,
        AND: [visibilityWhere],
      },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        description: true,
        location: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
        closedAt: true,
        status: { select: { name: true, isFinal: true } },
        category: { select: { name: true } },
        service: { select: { name: true } },
        requester: { select: { firstName: true, lastName: true, email: true } },
        assignedTo: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    return {
      query: input.query,
      count: intervention ? 1 : 0,
      matchType: "exact_ticket",
      matches: intervention ? [toSearchResult(intervention)] : [],
    };
  }

  const interventions = await prisma.intervention.findMany({
    where: visibilityWhere,
    orderBy: [{ createdAt: "desc" }],
    take: 200,
    select: {
      id: true,
      ticketNumber: true,
      title: true,
      description: true,
      location: true,
      priority: true,
      createdAt: true,
      updatedAt: true,
      closedAt: true,
      status: { select: { name: true, isFinal: true } },
      category: { select: { name: true } },
      service: { select: { name: true } },
      requester: { select: { firstName: true, lastName: true, email: true } },
      assignedTo: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  const matches = interventions
    .map((intervention) => {
      const searchableFields = [
        { value: intervention.id, weight: 5 },
        { value: intervention.ticketNumber, weight: 5 },
        { value: intervention.title, weight: 4 },
        { value: intervention.description, weight: 3 },
        { value: intervention.location ?? "", weight: 3 },
        {
          value:
            `${intervention.requester.firstName} ${intervention.requester.lastName}`.trim(),
          weight: 2,
        },
        { value: intervention.requester.email ?? "", weight: 2 },
        {
          value: intervention.assignedTo
            ? `${intervention.assignedTo.firstName} ${intervention.assignedTo.lastName}`.trim()
            : "",
          weight: 2,
        },
        { value: intervention.assignedTo?.email ?? "", weight: 2 },
        { value: intervention.service?.name ?? "", weight: 2 },
        { value: intervention.category?.name ?? "", weight: 2 },
        { value: intervention.status.name, weight: 1.5 },
        {
          value: intervention.status.isFinal
            ? "ferme fermee cloture cloturee closed"
            : "ouvert ouverte open en cours actif active",
          weight: 1.5,
        },
        { value: PRIORITY_LABELS[intervention.priority], weight: 1 },
        { value: intervention.priority, weight: 1 },
        { value: formatSearchDate(intervention.createdAt), weight: 1 },
        { value: formatSearchDate(intervention.updatedAt), weight: 0.75 },
        { value: formatSearchDate(intervention.closedAt), weight: 0.75 },
      ];
      const score = searchableFields.reduce(
        (total, field) =>
          total + scoreSearchField(query, queryTokens, field.value, field.weight),
        0
      );

      return {
        score,
        intervention: toSearchResult(intervention),
      };
    })
    .filter((match) => match.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return right.intervention.createdAt.localeCompare(left.intervention.createdAt);
    })
    .slice(0, input.limit)
    .map((match) => match.intervention);

  return {
    query: input.query,
    count: matches.length,
    matchType: "fuzzy",
    matches,
  };
}

async function updateInterventionReport(
  user: SessionUserLike,
  input: z.infer<typeof interventionUpdateSchema>
) {
  const intervention = await findVisibleIntervention(user, input.reference);

  if (
    !canEditIntervention(
      {
        id: user.id,
        role: user.role,
        serviceId: user.serviceId,
        permissions: user.permissions,
      },
      intervention
    )
  ) {
    throw new Error("Vous n'avez pas les droits pour modifier cette intervention.");
  }

  let categoryId = undefined as string | null | undefined;
  let categoryName = intervention.category?.name ?? null;
  if (Object.hasOwn(input, "categoryName")) {
    const category = await findActiveCategory(input.categoryName);
    categoryId = category?.id ?? null;
    categoryName = category?.name ?? null;
  }

  let serviceId = undefined as string | null | undefined;
  let serviceName = intervention.service?.name ?? null;
  if (Object.hasOwn(input, "serviceName")) {
    const service = await findActiveService(input.serviceName);
    serviceId = service?.id ?? null;
    serviceName = service?.name ?? null;
  }

  const data = {
    ...(input.title !== undefined ? { title: input.title.trim() } : {}),
    ...(input.description !== undefined
      ? { description: input.description.trim() }
      : {}),
    ...(input.location !== undefined ? { location: input.location.trim() } : {}),
    ...(categoryId !== undefined ? { categoryId } : {}),
    ...(serviceId !== undefined ? { serviceId } : {}),
  };

  const changes: string[] = [];
  if (data.title !== undefined && intervention.title !== data.title) {
    changes.push("titre ajuste");
  }
  if (data.description !== undefined && intervention.description !== data.description) {
    changes.push("description mise a jour");
  }
  if (data.location !== undefined && (intervention.location ?? null) !== data.location) {
    changes.push("lieu modifie");
  }
  if (categoryId !== undefined && (intervention.category?.name ?? null) !== categoryName) {
    changes.push("categorie modifiee");
  }
  if (serviceId !== undefined && (intervention.service?.name ?? null) !== serviceName) {
    changes.push("service modifie");
  }

  if (changes.length === 0) {
    return {
      intervention: summarizeIntervention(user, intervention),
      message: `Aucune modification necessaire pour ${intervention.ticketNumber}.`,
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.intervention.update({
      where: { id: intervention.id },
      data,
    });

    await createInterventionHistoryEntry(tx, {
      interventionId: intervention.id,
      actorId: user.id,
      action: "modification",
      message: `Fiche modifiee depuis l'assistant: ${changes.join(", ")}.`,
    });
  });
  const updated = await findVisibleIntervention(user, intervention.id);

  return {
    intervention: summarizeIntervention(user, updated),
    message: `Intervention ${updated.ticketNumber} mise a jour: ${changes.join(", ")}.`,
  };
}

async function updateInterventionWorkflowFromAgent(
  user: SessionUserLike,
  input: z.infer<typeof interventionWorkflowSchema>
) {
  const intervention = await findVisibleIntervention(user, input.reference);

  if (
    !canManageInterventionWorkflow(
      {
        id: user.id,
        role: user.role,
        serviceId: user.serviceId,
        permissions: user.permissions,
      },
      intervention.serviceId
    )
  ) {
    throw new Error("Vous n'avez pas les droits pour piloter cette intervention.");
  }

  const status = input.statusName
    ? await findActiveStatus(input.statusName)
    : null;

  if (input.statusName && !status) {
    throw new Error(`Le statut "${input.statusName}" est introuvable ou inactif.`);
  }

  const assignee = Object.hasOwn(input, "assignedToName")
    ? await findAssignableUser(input.assignedToName, intervention.serviceId)
    : undefined;

  const data = {
    ...(status ? { statusId: status.id, closedAt: status.isFinal ? new Date() : null } : {}),
    ...(input.priority !== undefined ? { priority: input.priority as Priority } : {}),
    ...(assignee !== undefined ? { assignedToId: assignee?.id ?? null } : {}),
  };

  const changes: string[] = [];
  if (status && intervention.status.name !== status.name) {
    changes.push(`statut ${intervention.status.name} -> ${status.name}`);
  }
  if (input.priority !== undefined && intervention.priority !== input.priority) {
    changes.push(
      `priorite ${formatPriorityLabel(intervention.priority).toLowerCase()} -> ${formatPriorityLabel(
        input.priority
      ).toLowerCase()}`
    );
  }

  const previousAssigneeName = intervention.assignedTo
    ? `${intervention.assignedTo.firstName} ${intervention.assignedTo.lastName}`.trim()
    : null;
  const nextAssigneeName = assignee
    ? `${assignee.firstName} ${assignee.lastName}`.trim()
    : null;

  if (
    assignee !== undefined &&
    (intervention.assignedToId ?? null) !== (assignee?.id ?? null)
  ) {
    changes.push(
      `affectation ${formatNullableLabel(previousAssigneeName)} -> ${formatNullableLabel(
        nextAssigneeName
      )}`
    );
  }

  if (changes.length === 0) {
    return {
      intervention: summarizeIntervention(user, intervention),
      message: `Aucun changement de suivi necessaire pour ${intervention.ticketNumber}.`,
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.intervention.update({
      where: { id: intervention.id },
      data,
    });

    await createInterventionHistoryEntry(tx, {
      interventionId: intervention.id,
      actorId: user.id,
      action: assignee !== undefined && changes.length === 1 ? "affectation" : "statut",
      message: `Suivi modifie depuis l'assistant: ${changes.join(", ")}.`,
    });
  });
  const updated = await findVisibleIntervention(user, intervention.id);

  return {
    intervention: summarizeIntervention(user, updated),
    message: `Suivi de ${updated.ticketNumber} mis a jour: ${changes.join(", ")}.`,
  };
}

async function findAssignableUser(name: string | null | undefined, serviceId: string | null) {
  const cleanName = cleanOptionalName(name);

  if (!cleanName) {
    return null;
  }

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      status: "active",
      role: { in: ["agent", "responsable_service"] },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      serviceId: true,
    },
  });

  const matches = users.filter((user) => {
    const displayName = `${user.firstName} ${user.lastName}`.trim();

    return normalize(displayName) === normalize(cleanName);
  });

  if (matches.length === 0) {
    throw new Error(`L'agent "${cleanName}" est introuvable ou inactif.`);
  }

  if (matches.length > 1) {
    throw new Error(`Plusieurs agents correspondent a "${cleanName}". Precisez le nom complet.`);
  }

  const [user] = matches;

  if (serviceId && user.serviceId && user.serviceId !== serviceId) {
    throw new Error("L'agent assigne doit appartenir au meme service que l'intervention.");
  }

  return user;
}

async function validateInterventionReport(
  user: SessionUserLike,
  input: z.infer<typeof interventionCompletenessSchema>
) {
  if (input.reference) {
    const intervention = await findVisibleIntervention(user, input.reference);

    return {
      intervention: summarizeIntervention(user, intervention),
      ...validateInterventionFields(intervention),
    };
  }

  const draft = input.draft ?? {};

  return validateInterventionFields(draft);
}

function stringifyToolResult(result: unknown) {
  return JSON.stringify(result);
}

function getLatestDraftToolArgs(result: unknown) {
  const messages =
    result &&
    typeof result === "object" &&
    "messages" in result &&
    Array.isArray(result.messages)
      ? result.messages
      : [];

  for (const message of messages.toReversed()) {
    const toolCalls: Array<{ name?: unknown; args?: unknown }> =
      message &&
      typeof message === "object" &&
      "tool_calls" in message &&
      Array.isArray(message.tool_calls)
        ? message.tool_calls
        : [];
    const draftToolCall = toolCalls.find(
      (toolCall) =>
        toolCall.name === "prepare_intervention_draft"
    );

    if (draftToolCall && "args" in draftToolCall) {
      return draftToolCall.args;
    }
  }

  return null;
}

function getLatestInterventionToolResult(result: unknown) {
  const messages =
    result &&
    typeof result === "object" &&
    "messages" in result &&
    Array.isArray(result.messages)
      ? result.messages
      : [];

  for (const message of messages.toReversed()) {
    const content =
      message && typeof message === "object" && "content" in message
        ? message.content
        : null;

    if (typeof content !== "string" || !content.trim()) {
      continue;
    }

    try {
      const parsed = JSON.parse(content) as {
        intervention?: { id: string; ticketNumber: string; title: string };
      };

      if (parsed.intervention) {
        return parsed.intervention;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function getLatestAssistantContent(result: unknown) {
  const messages =
    result &&
    typeof result === "object" &&
    "messages" in result &&
    Array.isArray(result.messages)
      ? result.messages
      : [];

  for (const message of messages.toReversed()) {
    const content =
      message && typeof message === "object" && "content" in message
        ? message.content
        : null;

    if (typeof content !== "string" || !content.trim()) {
      continue;
    }

    try {
      JSON.parse(content);
      continue;
    } catch {
      return content.trim();
    }
  }

  return null;
}

function createInterventionAgentTools(user: SessionUserLike, threadId: string) {
  return [
    prepareInterventionDraftTool,
    tool(
      async (input) => stringifyToolResult(await searchInterventions(user, input)),
      {
        name: "search_interventions",
        description:
          "Search visible interventions from a natural language query. This is read-only and can return several possible matches.",
        schema: interventionSearchSchema,
      }
    ),
    tool(
      async (input) =>
        stringifyToolResult({
          intervention: await getInterventionDetails(user, input.reference),
        }),
      {
        name: "get_intervention_report_details",
        description:
          "Retrieve visible details, completeness, current classification, and available actions for one intervention report.",
        schema: interventionReferenceSchema,
      }
    ),
    tool(
      async (input) =>
        stringifyToolResult(await validateInterventionReport(user, input)),
      {
        name: "validate_intervention_report",
        description:
          "Check whether an intervention report or draft has the required title, description, and location. This is read-only.",
        schema: interventionCompletenessSchema,
      }
    ),
    tool(
      async (input) =>
        stringifyToolResult(await updateInterventionReport(user, input)),
      {
        name: "update_intervention_report",
        description:
          "Update editable content fields for an existing intervention report. Use only when the user explicitly asks to change report details.",
        schema: interventionUpdateSchema,
      }
    ),
    tool(
      async (input) =>
        stringifyToolResult(await updateInterventionWorkflowFromAgent(user, input)),
      {
        name: "update_intervention_workflow",
        description:
          "Update the status, priority, or assignee for an existing intervention. Use for classification, validation, completion, or assignment actions.",
        schema: interventionWorkflowSchema,
      }
    ),
    tool(
      async (input) =>
        stringifyToolResult({
          intervention: await createInterventionFromDraft(user, input),
        }),
      {
        name: "save_intervention_report",
        description:
          "Create and save a complete intervention report in the database when the user explicitly asks to save or create it.",
        schema: interventionDraftSchema,
      }
    ),
    tool(
      async () => {
        await resetInterventionAgentThread(threadId);

        return stringifyToolResult({
          message: "Le brouillon et le contexte de l'assistant ont ete reinitialises.",
        });
      },
      {
        name: "reset_intervention_draft",
        description:
          "Cancel or reset the current intervention draft and clear the assistant context when the user explicitly asks to start over.",
        schema: resetInterventionDraftSchema,
      }
    ),
  ];
}

export async function resetInterventionAgentThread(threadId: string) {
  await interventionCheckpointer.deleteThread(threadId);
}

export async function buildInterventionDraft(message: string, threadId: string) {
  const context = await getInterventionContext();
  const agent = createAgent({
    model: getModel(),
    tools: [prepareInterventionDraftTool],
    checkpointer: interventionCheckpointer,
    systemPrompt: [
      "You prepare intervention tickets for the Sussargues city hall.",
      "Extract one intervention draft from the latest user message.",
      "Use previous conversation turns from memory only to resolve references in the latest request.",
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
  });

  const result = await agent.invoke(
    {
      messages: [{ role: "user", content: message }],
    },
    {
      configurable: {
        thread_id: threadId,
      },
    }
  );
  const draftArgs = getLatestDraftToolArgs(result);

  if (!draftArgs) {
    throw new Error("L'assistant n'a pas prepare de brouillon d'intervention.");
  }

  const draft = interventionDraftSchema.parse(draftArgs);

  return {
    ...draft,
    categoryName: findKnownName(draft.categoryName, context.categories),
    serviceName: findKnownName(draft.serviceName, context.services),
  };
}

export async function runInterventionAgentMessage(
  user: SessionUserLike,
  message: string,
  threadId: string
): Promise<InterventionAgentResponse> {
  const context = await getInterventionContext();
  const agent = createAgent({
    model: getModel(),
    tools: createInterventionAgentTools(user, threadId),
    checkpointer: interventionCheckpointer,
    systemPrompt: [
      "You are the intervention assistant for the Sussargues city hall internal application.",
      "Answer naturally in French, briefly and clearly.",
      "You can help create, review, retrieve, update, validate for completeness, classify, complete, save, or reset intervention reports.",
      "Required report fields are title, description, and location. Priority defaults to normale when the user does not specify it.",
      "If required information is missing for a new report, ask one targeted question instead of inventing details.",
      "For a new report with enough information, call prepare_intervention_draft and explain that the user can review it before creation.",
      "Use save_intervention_report only when the user explicitly asks to save, create, or record a complete report now.",
      "Use reset_intervention_draft when the user explicitly asks to cancel the current draft, reset the assistant, or start over.",
      "Use search_interventions when the user describes an existing intervention without giving an exact ticket number or id.",
      "The search_interventions tool is read-only and may return zero, one, or several matches.",
      "If search_interventions returns no match, say that no matching intervention was found and ask for more details.",
      "If search_interventions returns several matches, list the ticket numbers with short identifying details and ask the user to choose one before any update or workflow action.",
      "If search_interventions returns one match, present it and ask for confirmation before any update or workflow action unless the user's latest message already clearly confirms that exact ticket number.",
      "Use get_intervention_report_details when the user asks to review, inspect, retrieve, summarize, or when you need current details before deciding.",
      "Use validate_intervention_report when the user asks whether a draft or existing report is complete.",
      "Use update_intervention_report only for explicit changes to title, description, location, category, or service.",
      "Use update_intervention_workflow for status, priority, assignment, classification, validation, or completion of an existing intervention.",
      "If the ticket number/id is missing for an existing intervention action, ask for it instead of using a mutation tool.",
      "When a tool succeeds, explain the concrete result and mention the ticket number.",
      "When a tool cannot complete an action, explain the reason and what is needed next.",
      "Use only these priorities for drafts or updates: basse, normale, haute, urgente.",
      "The location field can be free text.",
      "Do not replace a specific user location with a different available location.",
      "Use an available location only when it clearly refers to the same place mentioned by the user.",
      "Only set categoryName and serviceName when they exactly match one available value; otherwise leave it null or ask a follow-up.",
      "Only set statusName and assignedToName when they exactly match the user's intended existing status or assignee.",
      `Available context: ${JSON.stringify(context)}`,
    ].join("\n"),
  });

  const result = await agent.invoke(
    {
      messages: [{ role: "user", content: message }],
    },
    {
      configurable: {
        thread_id: threadId,
      },
    }
  );

  const draftArgs = getLatestDraftToolArgs(result);
  const draft = draftArgs ? interventionDraftSchema.parse(draftArgs) : null;
  const reply =
    getLatestAssistantContent(result) ??
    (draft
      ? "J'ai prepare un brouillon d'intervention. Verifiez les informations avant de creer le ticket."
      : "J'ai traite votre demande.");
  const intervention = getLatestInterventionToolResult(result);

  return {
    reply,
    ...(draft
      ? {
          draft: {
            ...draft,
            categoryName: findKnownName(draft.categoryName, context.categories),
            serviceName: findKnownName(draft.serviceName, context.services),
          },
        }
      : {}),
    ...(intervention
      ? {
          intervention: {
            id: intervention.id,
            ticketNumber: intervention.ticketNumber,
            title: intervention.title,
          },
        }
      : {}),
  };
}

export async function createInterventionFromDraft(
  user: SessionUserLike,
  draftInput: InterventionDraft
) {
  if (user.permissions && !user.permissions["intervention.create"]) {
    throw new Error("Vous n'avez pas les droits pour creer une intervention.");
  }

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
