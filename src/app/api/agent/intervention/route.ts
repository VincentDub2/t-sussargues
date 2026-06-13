import { NextResponse } from "next/server";
import * as z from "zod";

import { auth } from "@/auth";
import {
  buildInterventionDraft,
  createInterventionFromDraft,
  interventionDraftSchema,
} from "@/lib/intervention-agent";
import { getRolePermissions } from "@/lib/permissions";

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("draft"),
    message: z.string().min(3).max(2000),
  }),
  z.object({
    action: z.literal("create"),
    draft: interventionDraftSchema,
  }),
]);

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user || !session.user.isActive || session.user.status !== "active") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = await getRolePermissions(session.user.role);

  if (!permissions["intervention.create"]) {
    return NextResponse.json(
      { error: "Vous n'avez pas les droits pour creer une intervention." },
      { status: 403 }
    );
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Requete invalide." }, { status: 400 });
  }

  try {
    if (parsed.data.action === "draft") {
      const draft = await buildInterventionDraft(parsed.data.message);

      return NextResponse.json({
        draft,
        reply:
          "J'ai prepare un brouillon d'intervention. Verifiez les informations avant de creer le ticket.",
      });
    }

    const intervention = await createInterventionFromDraft(
      {
        id: session.user.id,
        role: session.user.role,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
      },
      parsed.data.draft
    );

    return NextResponse.json({
      intervention,
      reply: `Intervention ${intervention.ticketNumber} creee.`,
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
