import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
import { createAgent, tool } from "langchain";
import * as z from "zod";

import type { Priority, PurchaseStatus, Role } from "@/generated/prisma/client";
import {
  sendPurchaseRejectedEmail,
  sendPurchaseValidatedEmail,
} from "@/lib/email";
import { PRIORITY_LABELS, PURCHASE_STATUS_LABELS } from "@/lib/labels";
import type { PermissionSet } from "@/lib/permissions";
import { createPurchaseHistoryEntry } from "@/lib/purchase-history";
import {
  canEditPurchaseDraft,
  canManagePurchaseWorkflow,
  getPurchaseVisibilityWhere,
  getPurchaseWorkflowTargets,
  isPurchaseClosed,
} from "@/lib/purchases";
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
  permissions?: PermissionSet;
};

type PurchaseAgentResponse = {
  reply: string;
  draft?: PurchaseDraft;
  purchase?: {
    id: string;
    requestNumber: string;
    title: string;
  };
};

const purchaseReferenceSchema = z.object({
  reference: z
    .string()
    .min(2)
    .max(80)
    .describe("Purchase request id or request number, for example ACH-2026-0001."),
});

const purchaseSearchSchema = z.object({
  query: z
    .string()
    .min(2)
    .max(240)
    .describe("Natural language search query for an existing purchase request."),
  limit: z.number().int().min(1).max(10).default(5),
});

const purchaseUpdateSchema = purchaseReferenceSchema
  .extend({
    title: z.string().min(3).max(140).optional(),
    description: z.string().min(10).max(1400).optional(),
    supplier: z.string().nullable().optional(),
    quantity: z.number().int().positive().nullable().optional(),
    estimatedBudget: z.number().positive().nullable().optional(),
    priority: z.enum(priorities).optional(),
    serviceName: z.string().nullable().optional(),
  })
  .refine(
    (input) =>
      [
        "title",
        "description",
        "supplier",
        "quantity",
        "estimatedBudget",
        "priority",
        "serviceName",
      ].some((key) => Object.hasOwn(input, key)),
    {
      message: "Au moins un champ doit etre fourni pour mettre a jour la demande.",
    }
  );

const purchaseDecisionSchema = purchaseReferenceSchema.extend({
  comment: z.string().nullable().default(null),
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

function cleanOptionalString(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function formatBudget(value: number | null) {
  return value === null ? null : value.toFixed(2);
}

function formatNullableBudget(value: number | null | undefined) {
  if (value === undefined) {
    return undefined;
  }

  return value === null ? null : value.toFixed(2);
}

function formatStatusTransition(from: PurchaseStatus, to: PurchaseStatus) {
  return `${PURCHASE_STATUS_LABELS[from]} -> ${PURCHASE_STATUS_LABELS[to]}`;
}

function getUserDisplayName(user: Pick<SessionUserLike, "firstName" | "lastName">) {
  return `${user.firstName} ${user.lastName}`.trim();
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

function levenshteinDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = previous[0];
    previous[0] = leftIndex;

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const current = previous[rightIndex];
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      previous[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + 1,
        diagonal + cost
      );
      diagonal = current;
    }
  }

  return previous[right.length] ?? 0;
}

function fuzzyTokenScore(queryToken: string, textToken: string) {
  if (queryToken === textToken) {
    return 14;
  }

  if (textToken.startsWith(queryToken)) {
    return 11;
  }

  if (textToken.includes(queryToken) || queryToken.includes(textToken)) {
    return 8;
  }

  if (queryToken.length >= 4 && textToken.length >= 4) {
    const distance = levenshteinDistance(queryToken, textToken);
    const allowedDistance = queryToken.length <= 5 ? 1 : 2;

    if (distance <= allowedDistance) {
      return 6;
    }
  }

  if (queryToken.length >= 4 && isSubsequence(queryToken, textToken)) {
    return 3;
  }

  return 0;
}

function scoreSearchField(query: string, queryTokens: string[], value: string, weight: number) {
  const normalizedValue = normalize(value);
  const fieldTokens = tokenize(value);

  if (!normalizedValue || fieldTokens.length === 0) {
    return 0;
  }

  let score = 0;

  if (normalizedValue === query) {
    score += 80 * weight;
  } else if (normalizedValue.includes(query)) {
    score += 36 * weight;
  }

  for (const queryToken of queryTokens) {
    const tokenScore = fieldTokens.reduce(
      (best, fieldToken) => Math.max(best, fuzzyTokenScore(queryToken, fieldToken)),
      0
    );
    score += tokenScore * weight;
  }

  return score;
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

async function findVisiblePurchase(user: SessionUserLike, reference: string) {
  const normalizedReference = reference.trim();

  if (!normalizedReference) {
    throw new Error("Indiquez le numero ou l'identifiant de la demande d'achat.");
  }

  const purchase = await prisma.purchaseRequest.findFirst({
    where: {
      OR: [
        { id: normalizedReference },
        { requestNumber: normalizedReference },
        { requestNumber: normalizedReference.toUpperCase() },
      ],
      AND: [
        getPurchaseVisibilityWhere({
          id: user.id,
          role: user.role,
          serviceId: user.serviceId,
          permissions: user.permissions,
        }),
      ],
    },
    select: {
      id: true,
      requestNumber: true,
      title: true,
      description: true,
      supplier: true,
      quantity: true,
      estimatedBudget: true,
      priority: true,
      status: true,
      requesterId: true,
      serviceId: true,
      validationComment: true,
      createdAt: true,
      updatedAt: true,
      service: {
        select: {
          name: true,
        },
      },
      requester: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      validator: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  if (!purchase) {
    throw new Error("Demande d'achat introuvable ou hors de votre perimetre.");
  }

  return purchase;
}

function summarizePurchase(
  user: SessionUserLike,
  purchase: Awaited<ReturnType<typeof findVisiblePurchase>>
) {
  const workflowTargets = getPurchaseWorkflowTargets(purchase.status);

  return {
    id: purchase.id,
    requestNumber: purchase.requestNumber,
    title: purchase.title,
    description: purchase.description,
    supplier: purchase.supplier,
    quantity: purchase.quantity,
    estimatedBudget: purchase.estimatedBudget?.toString() ?? null,
    priority: purchase.priority,
    priorityLabel: PRIORITY_LABELS[purchase.priority],
    status: purchase.status,
    statusLabel: PURCHASE_STATUS_LABELS[purchase.status],
    service: purchase.service?.name ?? null,
    requester: `${purchase.requester.firstName} ${purchase.requester.lastName}`.trim(),
    requesterEmail: purchase.requester.email,
    validator: purchase.validator
      ? `${purchase.validator.firstName} ${purchase.validator.lastName}`.trim()
      : null,
    validatorEmail: purchase.validator?.email ?? null,
    validationComment: purchase.validationComment,
    createdAt: purchase.createdAt.toISOString(),
    updatedAt: purchase.updatedAt.toISOString(),
    availableActions: {
      canUpdate: canEditPurchaseDraft(
        {
          id: user.id,
          role: user.role,
          serviceId: user.serviceId,
          permissions: user.permissions,
        },
        purchase
      ),
      canSubmit:
        !isPurchaseClosed(purchase.status) &&
        canEditPurchaseDraft(
          {
            id: user.id,
            role: user.role,
            serviceId: user.serviceId,
            permissions: user.permissions,
          },
          purchase
        ),
      workflowTargets,
      canManageWorkflow: canManagePurchaseWorkflow(
        {
          id: user.id,
          role: user.role,
          serviceId: user.serviceId,
          permissions: user.permissions,
        },
        purchase.serviceId
      ),
    },
  };
}

async function getPurchaseDetails(user: SessionUserLike, reference: string) {
  const purchase = await findVisiblePurchase(user, reference);

  return summarizePurchase(user, purchase);
}

async function searchPurchaseRequests(
  user: SessionUserLike,
  input: z.infer<typeof purchaseSearchSchema>
) {
  const query = normalize(input.query);
  const queryTokens = tokenize(input.query);

  if (!query || queryTokens.length === 0) {
    throw new Error("Indiquez quelques mots pour rechercher une demande d'achat.");
  }

  const purchases = await prisma.purchaseRequest.findMany({
    where: getPurchaseVisibilityWhere({
      id: user.id,
      role: user.role,
      serviceId: user.serviceId,
      permissions: user.permissions,
    }),
    orderBy: [{ createdAt: "desc" }],
    take: 200,
    select: {
      id: true,
      requestNumber: true,
      title: true,
      description: true,
      supplier: true,
      quantity: true,
      estimatedBudget: true,
      priority: true,
      status: true,
      validationComment: true,
      createdAt: true,
      requester: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      service: {
        select: {
          name: true,
        },
      },
    },
  });

  const matches = purchases
    .map((purchase) => {
      const requesterName =
        `${purchase.requester.firstName} ${purchase.requester.lastName}`.trim();
      const estimatedBudget = purchase.estimatedBudget?.toString() ?? null;
      const searchableFields = [
        { value: purchase.requestNumber, weight: 5 },
        { value: purchase.title, weight: 4 },
        { value: purchase.description, weight: 3 },
        { value: purchase.supplier ?? "", weight: 3 },
        { value: requesterName, weight: 2 },
        { value: purchase.requester.email ?? "", weight: 2 },
        { value: purchase.service?.name ?? "", weight: 2 },
        { value: PURCHASE_STATUS_LABELS[purchase.status], weight: 1.5 },
        { value: purchase.status, weight: 1.5 },
        { value: PRIORITY_LABELS[purchase.priority], weight: 1 },
        { value: purchase.priority, weight: 1 },
        { value: estimatedBudget ?? "", weight: 1 },
        { value: purchase.quantity ? String(purchase.quantity) : "", weight: 0.5 },
        { value: purchase.validationComment ?? "", weight: 0.5 },
      ];
      const score = searchableFields.reduce(
        (total, field) =>
          total + scoreSearchField(query, queryTokens, field.value, field.weight),
        0
      );

      return {
        score,
        purchase: {
          id: purchase.id,
          requestNumber: purchase.requestNumber,
          title: purchase.title,
          description: purchase.description,
          supplier: purchase.supplier,
          quantity: purchase.quantity,
          estimatedBudget,
          priority: purchase.priority,
          priorityLabel: PRIORITY_LABELS[purchase.priority],
          status: purchase.status,
          statusLabel: PURCHASE_STATUS_LABELS[purchase.status],
          requester: requesterName,
          requesterEmail: purchase.requester.email,
          service: purchase.service?.name ?? null,
          createdAt: purchase.createdAt.toISOString(),
        },
      };
    })
    .filter((match) => match.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return right.purchase.createdAt.localeCompare(left.purchase.createdAt);
    })
    .slice(0, input.limit)
    .map((match) => match.purchase);

  return {
    query: input.query,
    count: matches.length,
    matches,
  };
}

async function updatePurchaseRequest(
  user: SessionUserLike,
  input: z.infer<typeof purchaseUpdateSchema>
) {
  const purchase = await findVisiblePurchase(user, input.reference);

  if (
    !canEditPurchaseDraft(
      {
        id: user.id,
        role: user.role,
        serviceId: user.serviceId,
        permissions: user.permissions,
      },
      purchase
    )
  ) {
    throw new Error(
      "Cette demande ne peut plus etre modifiee ou ne vous appartient pas."
    );
  }

  let serviceId = purchase.serviceId;
  if (Object.hasOwn(input, "serviceName")) {
    if (!user.canChooseService) {
      throw new Error("Vous ne pouvez pas modifier le service de cette demande.");
    }

    if (input.serviceName) {
      const service = await findActiveService(input.serviceName);
      serviceId = service?.id ?? null;
    } else {
      serviceId = null;
    }
  }

  const nextEstimatedBudget = formatNullableBudget(input.estimatedBudget);
  const data = {
    ...(input.title !== undefined ? { title: input.title.trim() } : {}),
    ...(input.description !== undefined
      ? { description: input.description.trim() }
      : {}),
    ...(Object.hasOwn(input, "supplier")
      ? { supplier: cleanOptionalString(input.supplier) }
      : {}),
    ...(Object.hasOwn(input, "quantity") ? { quantity: input.quantity } : {}),
    ...(nextEstimatedBudget !== undefined
      ? { estimatedBudget: nextEstimatedBudget }
      : {}),
    ...(input.priority !== undefined ? { priority: input.priority as Priority } : {}),
    ...(Object.hasOwn(input, "serviceName") ? { serviceId } : {}),
  };

  const changes: string[] = [];
  if (data.title !== undefined && purchase.title !== data.title) {
    changes.push("objet ajuste");
  }
  if (data.description !== undefined && purchase.description !== data.description) {
    changes.push("description mise a jour");
  }
  if (data.supplier !== undefined && purchase.supplier !== data.supplier) {
    changes.push("fournisseur mis a jour");
  }
  if (data.quantity !== undefined && purchase.quantity !== data.quantity) {
    changes.push("quantite ajustee");
  }
  if (
    data.estimatedBudget !== undefined &&
    (purchase.estimatedBudget?.toString() ?? null) !== data.estimatedBudget
  ) {
    changes.push("budget ajuste");
  }
  if (data.priority !== undefined && purchase.priority !== data.priority) {
    changes.push("priorite mise a jour");
  }
  if (data.serviceId !== undefined && purchase.serviceId !== data.serviceId) {
    changes.push("service mis a jour");
  }

  if (changes.length === 0) {
    return {
      purchase: summarizePurchase(user, purchase),
      message: `Aucune modification necessaire pour ${purchase.requestNumber}.`,
    };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const nextPurchase = await tx.purchaseRequest.update({
      where: { id: purchase.id },
      data,
      select: {
        id: true,
        requestNumber: true,
        title: true,
        description: true,
        supplier: true,
        quantity: true,
        estimatedBudget: true,
        priority: true,
        status: true,
        requesterId: true,
        serviceId: true,
        validationComment: true,
        createdAt: true,
        updatedAt: true,
        service: { select: { name: true } },
        requester: { select: { firstName: true, lastName: true, email: true } },
        validator: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    await createPurchaseHistoryEntry(tx, {
      purchaseRequestId: purchase.id,
      actorId: user.id,
      action: "modification",
      message: `Demande modifiee depuis l'assistant: ${changes.join(", ")}.`,
    });

    return nextPurchase;
  });

  return {
    purchase: summarizePurchase(user, updated),
    message: `Demande ${updated.requestNumber} mise a jour: ${changes.join(", ")}.`,
  };
}

async function submitPurchaseForValidation(user: SessionUserLike, reference: string) {
  const purchase = await findVisiblePurchase(user, reference);

  if (
    !canEditPurchaseDraft(
      {
        id: user.id,
        role: user.role,
        serviceId: user.serviceId,
        permissions: user.permissions,
      },
      purchase
    )
  ) {
    throw new Error("Seul le demandeur peut soumettre un brouillon encore editable.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const nextPurchase = await tx.purchaseRequest.update({
      where: { id: purchase.id },
      data: {
        status: "soumise",
        validationComment: null,
        validatorId: null,
      },
      select: {
        id: true,
        requestNumber: true,
        title: true,
        description: true,
        supplier: true,
        quantity: true,
        estimatedBudget: true,
        priority: true,
        status: true,
        requesterId: true,
        serviceId: true,
        validationComment: true,
        createdAt: true,
        updatedAt: true,
        service: { select: { name: true } },
        requester: { select: { firstName: true, lastName: true, email: true } },
        validator: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    await createPurchaseHistoryEntry(tx, {
      purchaseRequestId: purchase.id,
      actorId: user.id,
      action: "soumission",
      message:
        purchase.status === "informations_demandees"
          ? "Demande mise a jour puis renvoyee pour validation depuis l'assistant."
          : "Demande soumise pour validation depuis l'assistant.",
    });

    return nextPurchase;
  });

  return {
    purchase: summarizePurchase(user, updated),
    message: `Demande ${updated.requestNumber} soumise pour validation.`,
  };
}

async function decidePurchaseRequest(
  user: SessionUserLike,
  {
    reference,
    status,
    comment,
  }: {
    reference: string;
    status: Extract<
      PurchaseStatus,
      "validee" | "refusee" | "informations_demandees" | "cloturee"
    >;
    comment?: string | null;
  }
) {
  const purchase = await findVisiblePurchase(user, reference);
  const validationComment = cleanOptionalString(comment);
  const availableTargets = getPurchaseWorkflowTargets(purchase.status);

  if (!availableTargets.some((candidate) => candidate === status)) {
    throw new Error("Le statut choisi n'est pas autorise dans ce workflow.");
  }

  if (
    !canManagePurchaseWorkflow(
      {
        id: user.id,
        role: user.role,
        serviceId: user.serviceId,
        permissions: user.permissions,
      },
      purchase.serviceId
    )
  ) {
    throw new Error(
      "Seuls un administrateur, un elu ou un responsable du service peuvent valider cette demande."
    );
  }

  if (isPurchaseClosed(purchase.status)) {
    throw new Error("Une demande cloturee ne peut plus evoluer.");
  }

  if (["refusee", "informations_demandees"].includes(status) && !validationComment) {
    throw new Error("Un commentaire est obligatoire pour motiver cette decision.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const nextPurchase = await tx.purchaseRequest.update({
      where: { id: purchase.id },
      data: {
        status,
        validatorId: user.id,
        validationComment,
      },
      select: {
        id: true,
        requestNumber: true,
        title: true,
        description: true,
        supplier: true,
        quantity: true,
        estimatedBudget: true,
        priority: true,
        status: true,
        requesterId: true,
        serviceId: true,
        validationComment: true,
        createdAt: true,
        updatedAt: true,
        service: { select: { name: true } },
        requester: { select: { firstName: true, lastName: true, email: true } },
        validator: { select: { firstName: true, lastName: true, email: true } },
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
      purchaseRequestId: purchase.id,
      actorId: user.id,
      action: historyAction,
      message: `${historyMessage} (${formatStatusTransition(purchase.status, status)})`,
    });

    return nextPurchase;
  });

  if (status === "validee" && purchase.requester.email) {
    await sendPurchaseValidatedEmail({
      email: purchase.requester.email,
      firstName: purchase.requester.firstName,
      requestNumber: purchase.requestNumber,
      title: purchase.title,
      decidedByName: getUserDisplayName(user),
      comment: validationComment,
    });
  }

  if (status === "refusee" && purchase.requester.email) {
    await sendPurchaseRejectedEmail({
      email: purchase.requester.email,
      firstName: purchase.requester.firstName,
      requestNumber: purchase.requestNumber,
      title: purchase.title,
      decidedByName: getUserDisplayName(user),
      comment: validationComment,
    });
  }

  return {
    purchase: summarizePurchase(user, updated),
    message:
      status === "validee"
        ? `Demande ${updated.requestNumber} validee.`
        : status === "refusee"
          ? `Demande ${updated.requestNumber} refusee.`
          : status === "informations_demandees"
            ? `Informations complementaires demandees pour ${updated.requestNumber}.`
            : `Demande ${updated.requestNumber} cloturee.`,
  };
}

async function cancelPurchaseRequest(
  user: SessionUserLike,
  input: z.infer<typeof purchaseDecisionSchema>
) {
  const purchase = await findVisiblePurchase(user, input.reference);
  const comment = cleanOptionalString(input.comment);

  if (isPurchaseClosed(purchase.status)) {
    throw new Error("Cette demande est deja cloturee.");
  }

  const canCancelAsRequester =
    user.id === purchase.requesterId &&
    ["brouillon", "soumise", "informations_demandees"].includes(purchase.status);
  const canCancelAsManager = canManagePurchaseWorkflow(
    {
      id: user.id,
      role: user.role,
      serviceId: user.serviceId,
      permissions: user.permissions,
    },
    purchase.serviceId
  );

  if (!canCancelAsRequester && !canCancelAsManager) {
    throw new Error("Vous ne pouvez pas annuler cette demande d'achat.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const nextPurchase = await tx.purchaseRequest.update({
      where: { id: purchase.id },
      data: {
        status: "cloturee",
        validatorId: canCancelAsManager ? user.id : null,
        validationComment: comment,
      },
      select: {
        id: true,
        requestNumber: true,
        title: true,
        description: true,
        supplier: true,
        quantity: true,
        estimatedBudget: true,
        priority: true,
        status: true,
        requesterId: true,
        serviceId: true,
        validationComment: true,
        createdAt: true,
        updatedAt: true,
        service: { select: { name: true } },
        requester: { select: { firstName: true, lastName: true, email: true } },
        validator: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    await createPurchaseHistoryEntry(tx, {
      purchaseRequestId: purchase.id,
      actorId: user.id,
      action: "cloture",
      message: `Demande ${purchase.requestNumber} annulee depuis l'assistant.${comment ? ` Commentaire: ${comment}` : ""}`,
    });

    return nextPurchase;
  });

  return {
    purchase: summarizePurchase(user, updated),
    message: `Demande ${updated.requestNumber} annulee.`,
  };
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

function getLatestPurchaseToolResult(result: unknown) {
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

    if (typeof content !== "string") {
      continue;
    }

    try {
      const parsed = JSON.parse(content) as {
        purchase?: { id: string; requestNumber: string; title: string };
      };

      if (parsed.purchase?.id && parsed.purchase.requestNumber && parsed.purchase.title) {
        return parsed.purchase;
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

function stringifyToolResult(result: unknown) {
  return JSON.stringify(result);
}

function createPurchaseAgentTools(user: SessionUserLike) {
  return [
    preparePurchaseDraftTool,
    tool(
      async (input) => stringifyToolResult(await searchPurchaseRequests(user, input)),
      {
        name: "search_purchase_requests",
        description:
          "Search visible purchase requests from a natural language query. This is read-only and can return several possible matches.",
        schema: purchaseSearchSchema,
      }
    ),
    tool(
      async (input) =>
        stringifyToolResult({
          purchase: await getPurchaseDetails(user, input.reference),
        }),
      {
        name: "get_purchase_request_details",
        description:
          "Retrieve visible details, current status, editable fields, and available actions for one purchase request.",
        schema: purchaseReferenceSchema,
      }
    ),
    tool(
      async (input) => stringifyToolResult(await updatePurchaseRequest(user, input)),
      {
        name: "update_purchase_request",
        description:
          "Update editable draft fields for a purchase request. Use only when the user explicitly asks to change request content.",
        schema: purchaseUpdateSchema,
      }
    ),
    tool(
      async (input) =>
        stringifyToolResult(await submitPurchaseForValidation(user, input.reference)),
      {
        name: "submit_purchase_request",
        description:
          "Submit an editable purchase request draft, or an information-requested request, for validation.",
        schema: purchaseReferenceSchema,
      }
    ),
    tool(
      async (input) =>
        stringifyToolResult(
          await decidePurchaseRequest(user, {
            reference: input.reference,
            status: "validee",
            comment: input.comment,
          })
        ),
      {
        name: "validate_purchase_request",
        description:
          "Validate a submitted purchase request. Only users with purchase validation rights can use this.",
        schema: purchaseDecisionSchema,
      }
    ),
    tool(
      async (input) =>
        stringifyToolResult(
          await decidePurchaseRequest(user, {
            reference: input.reference,
            status: "refusee",
            comment: input.comment,
          })
        ),
      {
        name: "reject_purchase_request",
        description:
          "Reject a submitted purchase request. A clear rejection comment is required.",
        schema: purchaseDecisionSchema,
      }
    ),
    tool(
      async (input) =>
        stringifyToolResult(
          await decidePurchaseRequest(user, {
            reference: input.reference,
            status: "informations_demandees",
            comment: input.comment,
          })
        ),
      {
        name: "request_purchase_information",
        description:
          "Ask the requester for more information about a submitted purchase request. A clear comment is required.",
        schema: purchaseDecisionSchema,
      }
    ),
    tool(
      async (input) => stringifyToolResult(await cancelPurchaseRequest(user, input)),
      {
        name: "cancel_purchase_request",
        description:
          "Cancel and close a purchase request when the requester or an authorized manager explicitly asks for cancellation.",
        schema: purchaseDecisionSchema,
      }
    ),
  ];
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

export async function runPurchaseAgentMessage(
  user: SessionUserLike,
  message: string,
  threadId: string
): Promise<PurchaseAgentResponse> {
  const context = await getPurchaseContext();
  const agent = createAgent({
    model: getModel(),
    tools: createPurchaseAgentTools(user),
    checkpointer: purchaseCheckpointer,
    systemPrompt: [
      "You are the purchase assistant for the Sussargues city hall internal application.",
      "Answer naturally in French, briefly and clearly.",
      "You can help create, review, update, submit, validate, reject, request more information for, or cancel purchase requests.",
      "For a new purchase request, call prepare_purchase_draft exactly once and explain that the user must confirm creation before it is saved.",
      "Use search_purchase_requests when the user describes an existing purchase request without giving an exact request number or id.",
      "The search_purchase_requests tool is read-only and may return zero, one, or several matches.",
      "If search_purchase_requests returns no match, say that no matching request was found and ask for more details.",
      "If search_purchase_requests returns several matches, list the request numbers with short identifying details and ask the user to choose one before any update, validation, rejection, information request, or cancellation.",
      "If search_purchase_requests returns one match, present it and ask for confirmation before any update, validation, rejection, information request, or cancellation unless the user's latest message already clearly confirms that exact request number.",
      "For an existing request, use get_purchase_request_details when the user asks to review, inspect, summarize, or when you need the current status before deciding.",
      "Use update_purchase_request only for explicit content changes. Do not invent missing values.",
      "Use submit_purchase_request when the requester asks to submit or resubmit an editable request for validation.",
      "Use validate_purchase_request only when the user clearly approves/validates a submitted request.",
      "Use reject_purchase_request only when the user clearly refuses a submitted request; a rejection comment is required.",
      "Use request_purchase_information when the validator asks for clarification; a comment is required.",
      "Use cancel_purchase_request only when the user explicitly asks to cancel or close a request as cancelled.",
      "If the request number/id is missing for an existing request action, ask for it instead of using a tool.",
      "If a required comment is missing, ask for the comment instead of using the decision tool.",
      "When a tool succeeds, explain the concrete result and mention the request number.",
      "When a tool cannot complete an action, explain the reason and what is needed next.",
      "Use only these priorities for drafts or updates: basse, normale, haute, urgente.",
      "Only set serviceName when it exactly matches one available value; otherwise leave it null or ask a follow-up.",
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
  const draft = draftArgs ? purchaseDraftSchema.parse(draftArgs) : null;
  const reply =
    getLatestAssistantContent(result) ??
    (draft
      ? "J'ai prepare un brouillon de demande d'achat. Verifiez les informations avant de creer la demande."
      : "J'ai traite votre demande.");
  const purchase = getLatestPurchaseToolResult(result);

  return {
    reply,
    ...(draft
      ? {
          draft: {
            ...draft,
            supplier: cleanOptionalString(draft.supplier),
            serviceName: findKnownName(draft.serviceName, context.services),
          },
        }
      : {}),
    ...(purchase
      ? {
          purchase: {
            id: purchase.id,
            requestNumber: purchase.requestNumber,
            title: purchase.title,
          },
        }
      : {}),
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
