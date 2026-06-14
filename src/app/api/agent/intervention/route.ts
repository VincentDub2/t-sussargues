import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import * as z from "zod";

import { auth } from "@/auth";
import {
  buildInterventionDraft,
  createInterventionFromDraft,
  interventionDraftSchema,
  resetInterventionAgentThread,
  runInterventionAgentMessage,
} from "@/lib/intervention-agent";
import { getRolePermissions } from "@/lib/permissions";

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("message"),
    message: z.string().min(3).max(2000),
  }),
  z.object({
    action: z.literal("draft"),
    message: z.string().min(3).max(2000),
  }),
  z.object({
    action: z.literal("create"),
    draft: interventionDraftSchema,
  }),
  z.object({
    action: z.literal("reset"),
  }),
]);

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user || !session.user.isActive || session.user.status !== "active") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = await getRolePermissions(session.user.role);

  if (
    !permissions["intervention.create"] &&
    !permissions["intervention.manage"] &&
    !permissions["intervention.view_all"]
  ) {
    return NextResponse.json(
      { error: "Vous n'avez pas les droits pour utiliser l'assistant intervention." },
      { status: 403 }
    );
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Requete invalide." }, { status: 400 });
  }

  try {
    const threadId = `intervention:${session.user.id}`;

    if (parsed.data.action === "reset") {
      await resetInterventionAgentThread(threadId);

      return NextResponse.json({ messages: [] });
    }

    if (parsed.data.action === "draft") {
      if (!permissions["intervention.create"]) {
        return NextResponse.json(
          { error: "Vous n'avez pas les droits pour creer une intervention." },
          { status: 403 }
        );
      }

      const draft = await buildInterventionDraft(parsed.data.message, threadId);
      const reply =
        "J'ai prepare un brouillon d'intervention. Verifiez les informations avant de creer le ticket.";

      return NextResponse.json({
        draft,
        reply,
      });
    }

    if (parsed.data.action === "message") {
      const response = await runInterventionAgentMessage(
        {
          id: session.user.id,
          role: session.user.role,
          serviceId: session.user.serviceId,
          firstName: session.user.firstName,
          lastName: session.user.lastName,
          permissions,
        },
        parsed.data.message,
        threadId
      );

      revalidatePath("/interventions");
      if (response.intervention?.id) {
        revalidatePath(`/interventions/${response.intervention.id}`);
      }

      return NextResponse.json(response);
    }

    if (!permissions["intervention.create"]) {
      return NextResponse.json(
        { error: "Vous n'avez pas les droits pour creer une intervention." },
        { status: 403 }
      );
    }

    const intervention = await createInterventionFromDraft(
      {
        id: session.user.id,
        role: session.user.role,
        serviceId: session.user.serviceId,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        permissions,
      },
      parsed.data.draft
    );
    const reply = `Intervention ${intervention.ticketNumber} creee.`;

    revalidatePath("/interventions");

    return NextResponse.json({
      intervention,
      reply,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "L'assistant n'a pas pu traiter la demande.",
      },
      { status: 500 }
    );
  }
}
