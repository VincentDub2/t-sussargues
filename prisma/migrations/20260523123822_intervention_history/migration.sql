-- CreateEnum
CREATE TYPE "InterventionHistoryAction" AS ENUM ('creation', 'modification', 'statut', 'affectation');

-- CreateTable
CREATE TABLE "InterventionHistory" (
    "id" TEXT NOT NULL,
    "interventionId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" "InterventionHistoryAction" NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterventionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InterventionHistory_interventionId_createdAt_idx" ON "InterventionHistory"("interventionId", "createdAt");

-- CreateIndex
CREATE INDEX "InterventionHistory_actorId_idx" ON "InterventionHistory"("actorId");

-- CreateIndex
CREATE INDEX "InterventionHistory_action_idx" ON "InterventionHistory"("action");

-- AddForeignKey
ALTER TABLE "InterventionHistory" ADD CONSTRAINT "InterventionHistory_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterventionHistory" ADD CONSTRAINT "InterventionHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
