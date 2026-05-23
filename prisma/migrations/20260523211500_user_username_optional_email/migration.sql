-- AlterTable
ALTER TABLE "User" ADD COLUMN "username" TEXT;

WITH normalized_usernames AS (
  SELECT
    "id",
    COALESCE(
      NULLIF(
        regexp_replace(
          lower(split_part("email", '@', 1)),
          '[^a-z0-9._-]+',
          '.',
          'g'
        ),
        ''
      ),
      'utilisateur'
    ) AS "baseUsername"
  FROM "User"
),
deduplicated_usernames AS (
  SELECT
    "id",
    "baseUsername",
    row_number() OVER (PARTITION BY "baseUsername" ORDER BY "id") AS "position"
  FROM normalized_usernames
)
UPDATE "User"
SET "username" = CASE
  WHEN deduplicated_usernames."position" = 1 THEN deduplicated_usernames."baseUsername"
  ELSE deduplicated_usernames."baseUsername" || deduplicated_usernames."position"
END
FROM deduplicated_usernames
WHERE "User"."id" = deduplicated_usernames."id";

ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
