-- CreateEnum
CREATE TYPE "PurchaseRequestHistoryAction" AS ENUM ('creation', 'modification', 'soumission', 'validation', 'refus', 'informations_complementaires', 'cloture');

-- CreateTable
CREATE TABLE "PurchaseRequestHistory" (
    "id" TEXT NOT NULL,
    "purchaseRequestId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" "PurchaseRequestHistoryAction" NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseRequestHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PurchaseRequestHistory_purchaseRequestId_createdAt_idx" ON "PurchaseRequestHistory"("purchaseRequestId", "createdAt");

-- CreateIndex
CREATE INDEX "PurchaseRequestHistory_actorId_idx" ON "PurchaseRequestHistory"("actorId");

-- CreateIndex
CREATE INDEX "PurchaseRequestHistory_action_idx" ON "PurchaseRequestHistory"("action");

-- AddForeignKey
ALTER TABLE "PurchaseRequestHistory" ADD CONSTRAINT "PurchaseRequestHistory_purchaseRequestId_fkey" FOREIGN KEY ("purchaseRequestId") REFERENCES "PurchaseRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequestHistory" ADD CONSTRAINT "PurchaseRequestHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
