CREATE TABLE "InterventionLocation" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "address" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InterventionLocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InterventionLocation_name_key" ON "InterventionLocation"("name");
