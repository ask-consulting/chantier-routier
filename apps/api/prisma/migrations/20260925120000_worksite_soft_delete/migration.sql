-- `worksites.deleted_at` — the second deliberate soft delete, after `workers`.
--
-- `timesheets.worksite_id` and `expenses.worksite_id` cascade: a real DELETE on
-- a worksite would erase the hours and receipts recorded against it — hours
-- somebody was paid for. `status` already carries `completed` and `suspended`,
-- but those are states a site manager chooses and that stay visible; "created
-- by mistake" is neither, hence a column of its own.
--
-- `null` means current. Every read that lists or looks up a worksite filters
-- on it.

ALTER TABLE "public"."worksites" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- The code must stay unique among *current* worksites only: otherwise deleting
-- `RN7-2026` by mistake would lock the code forever, behind a row nobody can
-- see. Prisma cannot declare the predicate, and introspects this index as the
-- plain `@@unique` it knows — same name, same columns — so there is no drift.
DROP INDEX "public"."uq_worksites_organization_id_code";
CREATE UNIQUE INDEX "uq_worksites_organization_id_code"
  ON "public"."worksites" ("organization_id", "code")
  WHERE "deleted_at" IS NULL;
