import "dotenv/config";
import { createAgent, tool } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import * as z from "zod";

import { prisma } from "@/lib/prisma";
import { createInterventionHistoryEntry } from "@/lib/intervention-history";
import { getNextReferenceNumber } from "@/lib/reference-numbers";

const priorities = ["basse", "normale", "haute", "urgente"] as const;

const openAiModel = new ChatOpenAI({
  model: process.env.OPENAI_MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: process.env.OPENAI_API_BASE
    ? {
        baseURL: process.env.OPENAI_API_BASE,
      }
    : undefined,
});

function normalize(value: string) {
  return value.trim().toLowerCase();
}

async function getRequester(requesterEmail?: string) {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      status: "active",
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
    },
  });

  const requestedEmail = requesterEmail ?? process.env.ADMIN_EMAIL;
  const requester = requestedEmail
    ? users.find((user) => user.email && normalize(user.email) === normalize(requestedEmail))
    : users.find((user) => user.role === "admin") ?? users[0];

  if (!requester) {
    throw new Error("No active user found to use as the intervention requester.");
  }

  return requester;
}

async function findActiveCategory(categoryName?: string) {
  if (!categoryName) {
    return null;
  }

  const categories = await prisma.interventionCategory.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });
  const category = categories.find(
    (item) => normalize(item.name) === normalize(categoryName)
  );

  if (!category) {
    throw new Error(
      `Unknown intervention category "${categoryName}". Available categories: ${categories
        .map((item) => item.name)
        .join(", ") || "none"}.`
    );
  }

  return category;
}

async function findActiveService(serviceName?: string) {
  if (!serviceName) {
    return null;
  }

  const services = await prisma.service.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });
  const service = services.find((item) => normalize(item.name) === normalize(serviceName));

  if (!service) {
    throw new Error(
      `Unknown service "${serviceName}". Available services: ${services
        .map((item) => item.name)
        .join(", ") || "none"}.`
    );
  }

  return service;
}

const getInterventionContext = tool(
  async () => {
    const [categories, services, statuses, locations] = await Promise.all([
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
      prisma.interventionStatus.findMany({
        where: { isActive: true },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
        select: { name: true, isFinal: true },
      }),
      prisma.interventionLocation.findMany({
        orderBy: { name: "asc" },
        select: { name: true },
      }),
    ]);

    return JSON.stringify({
      priorities,
      categories: categories.map((category) => category.name),
      services: services.map((service) => service.name),
      initialStatus: statuses[0]?.name ?? null,
      locations: locations.map((location) => location.name),
    });
  },
  {
    name: "get_intervention_context",
    description:
      "List the active intervention categories, services, locations, priorities, and initial status available in the database.",
    schema: z.object({}),
  }
);

const createInterventionTool = tool(
  async (input) => {
    const title = input.title.trim();
    const description = input.description.trim();
    const location = input.location.trim();

    if (!title || !description || !location) {
      throw new Error("Title, description, and location are required.");
    }

    const [requester, initialStatus, category, service] = await Promise.all([
      getRequester(input.requesterEmail),
      prisma.interventionStatus.findFirst({
        where: { isActive: true },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true, name: true, isFinal: true },
      }),
      findActiveCategory(input.categoryName),
      findActiveService(input.serviceName),
    ]);

    if (!initialStatus) {
      throw new Error("No active intervention status found.");
    }

    const intervention = await prisma.$transaction(async (tx) => {
      const ticketNumber = await getNextReferenceNumber(tx, {
        scope: "intervention",
        prefix: "INT",
      });

      const created = await tx.intervention.create({
        data: {
          ticketNumber,
          title,
          description,
          location,
          priority: input.priority,
          statusId: initialStatus.id,
          categoryId: category?.id ?? null,
          serviceId: service?.id ?? null,
          requesterId: requester.id,
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
        actorId: requester.id,
        action: "creation",
        message: "Intervention created from the CLI agent.",
      });

      return created;
    });

    return JSON.stringify({
      id: intervention.id,
      ticketNumber: intervention.ticketNumber,
      title: intervention.title,
      priority: intervention.priority,
      location: intervention.location,
      status: initialStatus.name,
      category: category?.name ?? null,
      service: service?.name ?? null,
      requester: `${requester.firstName} ${requester.lastName}`.trim(),
      createdAt: intervention.createdAt,
    });
  },
  {
    name: "create_intervention",
    description:
      "Create an intervention ticket in the database. Use get_intervention_context first if you need valid category or service names.",
    schema: z.object({
      title: z.string().describe("Short title of the intervention."),
      description: z.string().describe("Detailed description of the intervention."),
      location: z.string().describe("Where the intervention is needed."),
      priority: z.enum(priorities).default("normale"),
      categoryName: z.string().optional().describe("Existing active category name."),
      serviceName: z.string().optional().describe("Existing active service name."),
      requesterEmail: z
        .string()
        .email()
        .optional()
        .describe("Existing active user email. Defaults to ADMIN_EMAIL from .env."),
    }),
  }
);

const agent = createAgent({
  model: openAiModel,
  tools: [getInterventionContext, createInterventionTool],
  systemPrompt:
    "You are an internal city hall assistant. Extract the user's request and create exactly one intervention ticket. Use French values when relevant. If category or service is unclear, omit it.",
});

const prompt =
  process.argv.slice(2).join(" ") ||
  "Cree une intervention normale pour reparer une ampoule cassee dans le hall de la mairie. Description: l'ampoule principale ne fonctionne plus depuis ce matin.";

async function main() {
  const result = await agent.invoke({
    messages: [{ role: "user", content: prompt }],
  });

  console.dir(result, { depth: null });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
