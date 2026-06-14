import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import * as z from "zod";

import { auth } from "@/auth";
import {
  buildPurchaseDraft,
  createPurchaseFromDraft,
  purchaseDraftSchema,
  resetPurchaseAgentThread,
  runPurchaseAgentMessage,
} from "@/lib/purchase-agent";
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
    draft: purchaseDraftSchema,
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
    !permissions["purchase.create"] &&
    !permissions["purchase.validate"] &&
    !permissions["purchase.view_all"]
  ) {
    return NextResponse.json(
      { error: "Vous n'avez pas les droits pour utiliser l'assistant achat." },
      { status: 403 }
    );
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Requete invalide." }, { status: 400 });
  }

  try {
    const threadId = `purchase:${session.user.id}`;

    if (parsed.data.action === "reset") {
      await resetPurchaseAgentThread(threadId);

      return NextResponse.json({ messages: [] });
    }

    if (parsed.data.action === "draft") {
      if (!permissions["purchase.create"]) {
        return NextResponse.json(
          { error: "Vous n'avez pas les droits pour creer une demande d'achat." },
          { status: 403 }
        );
      }

      const draft = await buildPurchaseDraft(parsed.data.message, threadId);
      const reply =
        "J'ai prepare un brouillon de demande d'achat. Verifiez les informations avant de creer la demande.";

      return NextResponse.json({
        draft,
        reply,
      });
    }

    if (parsed.data.action === "message") {
      const response = await runPurchaseAgentMessage(
        {
          id: session.user.id,
          role: session.user.role,
          serviceId: session.user.serviceId,
          firstName: session.user.firstName,
          lastName: session.user.lastName,
          canChooseService: permissions["purchase.choose_service"],
          permissions,
        },
        parsed.data.message,
        threadId
      );

      revalidatePath("/achats");
      if (response.purchase?.id) {
        revalidatePath(`/achats/${response.purchase.id}`);
      }

      return NextResponse.json(response);
    }

    if (!permissions["purchase.create"]) {
      return NextResponse.json(
        { error: "Vous n'avez pas les droits pour creer une demande d'achat." },
        { status: 403 }
      );
    }

    const purchase = await createPurchaseFromDraft(
      {
        id: session.user.id,
        role: session.user.role,
        serviceId: session.user.serviceId,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        canChooseService: permissions["purchase.choose_service"],
        permissions,
      },
      parsed.data.draft
    );
    const reply = `Demande ${purchase.requestNumber} creee.`;

    revalidatePath("/achats");

    return NextResponse.json({
      purchase,
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
