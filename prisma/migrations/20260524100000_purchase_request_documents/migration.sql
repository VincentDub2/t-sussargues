-- CreateEnum
CREATE TYPE "PurchaseDocumentType" AS ENUM ('devis', 'ticket_caisse', 'facture', 'bon_commande', 'autre');

-- CreateTable
CREATE TABLE "PurchaseRequestDocument" (
    "id" TEXT NOT NULL,
    "purchaseRequestId" TEXT NOT NULL,
    "documentType" "PurchaseDocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "supplier" TEXT,
    "amount" DECIMAL(12,2),
    "issuedAt" TIMESTAMP(3),
    "reference" TEXT,
    "fileName" TEXT,
    "filePath" TEXT,
    "fileUrl" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseRequestDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PurchaseRequestDocument_purchaseRequestId_createdAt_idx" ON "PurchaseRequestDocument"("purchaseRequestId", "createdAt");

-- CreateIndex
CREATE INDEX "PurchaseRequestDocument_documentType_idx" ON "PurchaseRequestDocument"("documentType");

-- CreateIndex
CREATE INDEX "PurchaseRequestDocument_createdById_idx" ON "PurchaseRequestDocument"("createdById");

-- AddForeignKey
ALTER TABLE "PurchaseRequestDocument" ADD CONSTRAINT "PurchaseRequestDocument_purchaseRequestId_fkey" FOREIGN KEY ("purchaseRequestId") REFERENCES "PurchaseRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequestDocument" ADD CONSTRAINT "PurchaseRequestDocument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
