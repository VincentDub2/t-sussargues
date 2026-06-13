import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
import { createAgent, tool } from "langchain";
import * as z from "zod";

import type { Priority, Role } from "@/generated/prisma/client";
import { createPurchaseHistoryEntry } from "@/lib/purchase-history";
import { prisma } from "@/lib/prisma";
import { getNextReferenceNumber } from "@/lib/reference-numbers";

const priorities = ["basse", "normale", "haute", "urgente"] as const;
const purchaseCheckpointer = new MemorySaver();

export const purchaseDraftSchema = z.object({
  title: z.string().min(3).max(140),
  description: z.string().min(10).max(1400),
  supplier: z.string().nullable().default(null),
  quantity: z.number().int().positive().nullable().default(null),
  estimatedBudget: z.number().positive().nullable().default(null),
  priority: z.enum(priorities).default("normale"),
  serviceName: z.string().nullable().default(null),
});

export type PurchaseDraft = z.infer<typeof purchaseDraftSchema>;

const preparePurchaseDraftTool = tool((input) => input, {
  name: "prepare_purchase_draft",
  description:
    "Prepare a draft purchase request from the user's request. This does not create anything in the database.",
  schema: purchaseDraftSchema,
});

type SessionUserLike = {
  id: string;
  role: Role;
  serviceId: string | null;
  firstName: string;
  lastName: string;
  canChooseService: boolean;
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

function cleanOptionalString(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function formatBudget(value: number | null) {
  return value === null ? null : value.toFixed(2);
}

function findKnownName(name: string | null | undefined, availableNames: string[]) {
  const cleanName = cleanOptionalString(name);

  if (!cleanName) {
    return null;
  }

  return (
    availableNames.find((availableName) => normalize(availableName) === normalize(cleanName)) ??
    null
  );
}

async function getPurchaseContext() {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { name: true },
  });

  return {
    priorities,
    services: services.map((service) => service.name),
  };
}

async function findActiveService(serviceName?: string | null) {
  const name = cleanOptionalString(serviceName);

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
        toolCall.name === "prepare_purchase_draft"
    );

    if (draftToolCall && "args" in draftToolCall) {
      return draftToolCall.args;
    }
  }

  return null;
}

export async function resetPurchaseAgentThread(threadId: string) {
  await purchaseCheckpointer.deleteThread(threadId);
}

export async function buildPurchaseDraft(message: string, threadId: string) {
  const context = await getPurchaseContext();
  const agent = createAgent({
    model: getModel(),
    tools: [preparePurchaseDraftTool],
    checkpointer: purchaseCheckpointer,
    systemPrompt: [
      "You prepare purchase requests for the Sussargues city hall.",
      "Extract one draft purchase request from the latest user message.",
      "Use previous conversation turns from memory only to resolve references in the latest request.",
      "Use French for title and description.",
      "Use only these priorities: basse, normale, haute, urgente.",
      "Use null for supplier, quantity, estimatedBudget, or serviceName when unknown.",
      "Only set serviceName when it exactly matches one available value.",
      "If service is unclear, return null for it.",
      "Call the prepare_purchase_draft tool exactly once.",
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
    throw new Error("L'assistant n'a pas prepare de brouillon d'achat.");
  }

  const draft = purchaseDraftSchema.parse(draftArgs);

  return {
    ...draft,
    supplier: cleanOptionalString(draft.supplier),
    serviceName: findKnownName(draft.serviceName, context.services),
  };
}

export async function createPurchaseFromDraft(
  user: SessionUserLike,
  draftInput: PurchaseDraft
) {
  const draft = purchaseDraftSchema.parse(draftInput);
  const requestedService = user.canChooseService
    ? await findActiveService(draft.serviceName)
    : null;
  const serviceId = user.canChooseService
    ? requestedService?.id ?? null
    : user.serviceId;

  if (serviceId) {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { id: true, name: true },
    });

    if (!service) {
      throw new Error("Le service choisi est introuvable.");
    }
  }

  const purchase = await prisma.$transaction(async (tx) => {
    const requestNumber = await getNextReferenceNumber(tx, {
      scope: "purchase",
      prefix: "ACH",
    });

    const created = await tx.purchaseRequest.create({
      data: {
        requestNumber,
        title: draft.title,
        description: draft.description,
        supplier: cleanOptionalString(draft.supplier),
        quantity: draft.quantity,
        estimatedBudget: formatBudget(draft.estimatedBudget),
        priority: draft.priority as Priority,
        requesterId: user.id,
        serviceId,
      },
      select: {
        id: true,
        requestNumber: true,
        title: true,
        priority: true,
        estimatedBudget: true,
        createdAt: true,
        service: {
          select: {
            name: true,
          },
        },
      },
    });

    await createPurchaseHistoryEntry(tx, {
      purchaseRequestId: created.id,
      actorId: user.id,
      action: "creation",
      message: `Demande ${created.requestNumber} creee en brouillon depuis l'assistant.`,
    });

    return created;
  });

  return {
    id: purchase.id,
    requestNumber: purchase.requestNumber,
    title: purchase.title,
    priority: purchase.priority,
    estimatedBudget: purchase.estimatedBudget?.toString() ?? null,
    service: purchase.service?.name ?? null,
    requester: `${user.firstName} ${user.lastName}`.trim(),
    createdAt: purchase.createdAt.toISOString(),
  };
}
