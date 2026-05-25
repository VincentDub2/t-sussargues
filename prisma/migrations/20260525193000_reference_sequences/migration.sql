CREATE TABLE "ReferenceSequence" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "nextValue" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReferenceSequence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReferenceSequence_scope_year_key" ON "ReferenceSequence"("scope", "year");
CREATE INDEX "ReferenceSequence_scope_idx" ON "ReferenceSequence"("scope");

INSERT INTO "ReferenceSequence" ("id", "scope", "year", "nextValue", "updatedAt")
SELECT CONCAT('intervention-', EXTRACT(YEAR FROM "createdAt")::INT), 'intervention', EXTRACT(YEAR FROM "createdAt")::INT, COUNT(*)::INT + 1, CURRENT_TIMESTAMP
FROM "Intervention"
GROUP BY EXTRACT(YEAR FROM "createdAt")::INT
ON CONFLICT ("scope", "year") DO NOTHING;

INSERT INTO "ReferenceSequence" ("id", "scope", "year", "nextValue", "updatedAt")
SELECT CONCAT('purchase-', EXTRACT(YEAR FROM "createdAt")::INT), 'purchase', EXTRACT(YEAR FROM "createdAt")::INT, COUNT(*)::INT + 1, CURRENT_TIMESTAMP
FROM "PurchaseRequest"
GROUP BY EXTRACT(YEAR FROM "createdAt")::INT
ON CONFLICT ("scope", "year") DO NOTHING;
