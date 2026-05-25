import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/auth";
import { getFileStorage } from "@/lib/file-storage";
import { getPurchaseVisibilityWhere } from "@/lib/purchases";
import { prisma } from "@/lib/prisma";

type PurchaseDocumentRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

function encodeContentDisposition(fileName: string) {
  const fallback = fileName.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "'");
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function GET(
  _request: NextRequest,
  { params }: PurchaseDocumentRouteProps
) {
  const session = await auth();

  if (!session?.user || !session.user.isActive || session.user.status !== "active") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const document = await prisma.purchaseRequestDocument.findFirst({
    where: {
      id,
      purchaseRequest: getPurchaseVisibilityWhere({
        id: session.user.id,
        role: session.user.role,
        serviceId: session.user.serviceId,
      }),
    },
    select: {
      fileName: true,
      filePath: true,
      mimeType: true,
    },
  });

  if (!document?.filePath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const storedFile = await getFileStorage().get({ pathname: document.filePath });

  if (!storedFile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const headers = new Headers({
    "Content-Type": document.mimeType ?? storedFile.contentType,
    "Content-Disposition": encodeContentDisposition(
      document.fileName ?? "justificatif"
    ),
    "X-Content-Type-Options": "nosniff",
  });

  if (storedFile.size !== null) {
    headers.set("Content-Length", String(storedFile.size));
  }

  return new NextResponse(storedFile.stream, { headers });
}
