-- Applies the database naming conventions — see docs/10-conventions-base-de-donnees.md.
--
--   tables       snake_case plural            worksite     -> worksites
--   columns      snake_case                   "organizationId" -> organization_id
--   constraints  pk_ / fk_ / uq_ / ix_        worksite_pkey    -> pk_worksites
--   enums        snake_case                   "UserRole"       -> user_role
--   identifiers  native uuid instead of text  36-char text     -> 16-byte uuid
--
-- Hand-written, not generated. Prisma sees renamed tables as "unknown table
-- appeared, known table vanished" and emits DROP + CREATE, which would wipe every
-- row. RENAME preserves the data, and Postgres carries the rows, defaults and
-- statistics across untouched.
--
-- Prisma field names stay camelCase, so no application code changes: `@map` only
-- affects the SQL side.

-- ---------------------------------------------------------------------------
-- 1. Enum types
-- ---------------------------------------------------------------------------
ALTER TYPE "identity"."UserRole" RENAME TO "user_role";
ALTER TYPE "public"."WorksiteStatus" RENAME TO "worksite_status";
ALTER TYPE "public"."ExpenseType" RENAME TO "expense_type";

-- ---------------------------------------------------------------------------
-- 2. Drop foreign keys — they are renamed *and* retyped below, so they are
--    recreated from scratch at the end rather than altered in place.
-- ---------------------------------------------------------------------------
ALTER TABLE "identity"."app_user" DROP CONSTRAINT "app_user_organizationId_fkey";
ALTER TABLE "identity"."refresh_token" DROP CONSTRAINT "refresh_token_userId_fkey";
ALTER TABLE "public"."timesheet" DROP CONSTRAINT "timesheet_worksiteId_fkey";
ALTER TABLE "public"."timesheet" DROP CONSTRAINT "timesheet_workerId_fkey";
ALTER TABLE "public"."expense" DROP CONSTRAINT "expense_worksiteId_fkey";

-- ---------------------------------------------------------------------------
-- 3. Tables — singular to plural
-- ---------------------------------------------------------------------------
ALTER TABLE "identity"."organization" RENAME TO "organizations";
ALTER TABLE "identity"."app_user" RENAME TO "app_users";
ALTER TABLE "identity"."refresh_token" RENAME TO "refresh_tokens";
ALTER TABLE "public"."worksite" RENAME TO "worksites";
ALTER TABLE "public"."worker" RENAME TO "workers";
ALTER TABLE "public"."timesheet" RENAME TO "timesheets";
ALTER TABLE "public"."expense" RENAME TO "expenses";

-- ---------------------------------------------------------------------------
-- 4. Columns — camelCase to snake_case
--    Unquoted identifiers fold to lower case in Postgres, so every camelCase
--    column had to be quoted in every hand-written query. This ends that.
-- ---------------------------------------------------------------------------
ALTER TABLE "identity"."organizations" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "identity"."organizations" RENAME COLUMN "updatedAt" TO "updated_at";

ALTER TABLE "identity"."app_users" RENAME COLUMN "organizationId" TO "organization_id";
ALTER TABLE "identity"."app_users" RENAME COLUMN "passwordHash" TO "password_hash";
ALTER TABLE "identity"."app_users" RENAME COLUMN "firstName" TO "first_name";
ALTER TABLE "identity"."app_users" RENAME COLUMN "lastName" TO "last_name";
ALTER TABLE "identity"."app_users" RENAME COLUMN "workerId" TO "worker_id";
ALTER TABLE "identity"."app_users" RENAME COLUMN "lastLoginAt" TO "last_login_at";
ALTER TABLE "identity"."app_users" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "identity"."app_users" RENAME COLUMN "updatedAt" TO "updated_at";

ALTER TABLE "identity"."refresh_tokens" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "identity"."refresh_tokens" RENAME COLUMN "tokenHash" TO "token_hash";
ALTER TABLE "identity"."refresh_tokens" RENAME COLUMN "expiresAt" TO "expires_at";
ALTER TABLE "identity"."refresh_tokens" RENAME COLUMN "revokedAt" TO "revoked_at";
ALTER TABLE "identity"."refresh_tokens" RENAME COLUMN "replacedBy" TO "replaced_by";
ALTER TABLE "identity"."refresh_tokens" RENAME COLUMN "userAgent" TO "user_agent";
ALTER TABLE "identity"."refresh_tokens" RENAME COLUMN "createdAt" TO "created_at";

ALTER TABLE "public"."worksites" RENAME COLUMN "organizationId" TO "organization_id";
ALTER TABLE "public"."worksites" RENAME COLUMN "plannedStartDate" TO "planned_start_date";
ALTER TABLE "public"."worksites" RENAME COLUMN "plannedEndDate" TO "planned_end_date";
ALTER TABLE "public"."worksites" RENAME COLUMN "totalBudget" TO "total_budget";
ALTER TABLE "public"."worksites" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "public"."worksites" RENAME COLUMN "updatedAt" TO "updated_at";

ALTER TABLE "public"."workers" RENAME COLUMN "organizationId" TO "organization_id";
ALTER TABLE "public"."workers" RENAME COLUMN "hourlyRate" TO "hourly_rate";
ALTER TABLE "public"."workers" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "public"."workers" RENAME COLUMN "updatedAt" TO "updated_at";

ALTER TABLE "public"."timesheets" RENAME COLUMN "worksiteId" TO "worksite_id";
ALTER TABLE "public"."timesheets" RENAME COLUMN "workerId" TO "worker_id";
ALTER TABLE "public"."timesheets" RENAME COLUMN "hoursWorked" TO "hours_worked";
ALTER TABLE "public"."timesheets" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "public"."timesheets" RENAME COLUMN "updatedAt" TO "updated_at";

ALTER TABLE "public"."expenses" RENAME COLUMN "worksiteId" TO "worksite_id";
ALTER TABLE "public"."expenses" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "public"."expenses" RENAME COLUMN "updatedAt" TO "updated_at";

-- ---------------------------------------------------------------------------
-- 5. Identifiers — text to native uuid
--    16 bytes instead of a 36-character string: smaller indexes, faster
--    comparisons, and the database now rejects a malformed id itself.
--    Every existing value is already a valid UUID, so the cast cannot fail.
-- ---------------------------------------------------------------------------
ALTER TABLE "identity"."organizations" ALTER COLUMN "id" TYPE UUID USING "id"::uuid;

ALTER TABLE "identity"."app_users" ALTER COLUMN "id" TYPE UUID USING "id"::uuid;
ALTER TABLE "identity"."app_users" ALTER COLUMN "organization_id" TYPE UUID USING "organization_id"::uuid;
ALTER TABLE "identity"."app_users" ALTER COLUMN "worker_id" TYPE UUID USING "worker_id"::uuid;

ALTER TABLE "identity"."refresh_tokens" ALTER COLUMN "id" TYPE UUID USING "id"::uuid;
ALTER TABLE "identity"."refresh_tokens" ALTER COLUMN "user_id" TYPE UUID USING "user_id"::uuid;
ALTER TABLE "identity"."refresh_tokens" ALTER COLUMN "replaced_by" TYPE UUID USING "replaced_by"::uuid;

ALTER TABLE "public"."worksites" ALTER COLUMN "id" TYPE UUID USING "id"::uuid;
ALTER TABLE "public"."worksites" ALTER COLUMN "organization_id" TYPE UUID USING "organization_id"::uuid;

ALTER TABLE "public"."workers" ALTER COLUMN "id" TYPE UUID USING "id"::uuid;
ALTER TABLE "public"."workers" ALTER COLUMN "organization_id" TYPE UUID USING "organization_id"::uuid;

ALTER TABLE "public"."timesheets" ALTER COLUMN "id" TYPE UUID USING "id"::uuid;
ALTER TABLE "public"."timesheets" ALTER COLUMN "worksite_id" TYPE UUID USING "worksite_id"::uuid;
ALTER TABLE "public"."timesheets" ALTER COLUMN "worker_id" TYPE UUID USING "worker_id"::uuid;

ALTER TABLE "public"."expenses" ALTER COLUMN "id" TYPE UUID USING "id"::uuid;
ALTER TABLE "public"."expenses" ALTER COLUMN "worksite_id" TYPE UUID USING "worksite_id"::uuid;

-- ---------------------------------------------------------------------------
-- 6. Primary keys — pk_<table>
-- ---------------------------------------------------------------------------
ALTER TABLE "identity"."organizations" RENAME CONSTRAINT "organization_pkey" TO "pk_organizations";
ALTER TABLE "identity"."app_users" RENAME CONSTRAINT "app_user_pkey" TO "pk_app_users";
ALTER TABLE "identity"."refresh_tokens" RENAME CONSTRAINT "refresh_token_pkey" TO "pk_refresh_tokens";
ALTER TABLE "public"."worksites" RENAME CONSTRAINT "worksite_pkey" TO "pk_worksites";
ALTER TABLE "public"."workers" RENAME CONSTRAINT "worker_pkey" TO "pk_workers";
ALTER TABLE "public"."timesheets" RENAME CONSTRAINT "timesheet_pkey" TO "pk_timesheets";
ALTER TABLE "public"."expenses" RENAME CONSTRAINT "expense_pkey" TO "pk_expenses";

-- ---------------------------------------------------------------------------
-- 7. Unique indexes — uq_<table>_<columns>
-- ---------------------------------------------------------------------------
ALTER INDEX "identity"."app_user_email_key" RENAME TO "uq_app_users_email";
ALTER INDEX "identity"."app_user_workerId_key" RENAME TO "uq_app_users_worker_id";
ALTER INDEX "identity"."refresh_token_tokenHash_key" RENAME TO "uq_refresh_tokens_token_hash";
ALTER INDEX "public"."worksite_organizationId_code_key" RENAME TO "uq_worksites_organization_id_code";
ALTER INDEX "public"."timesheet_workerId_worksiteId_date_key" RENAME TO "uq_timesheets_worker_id_worksite_id_date";

-- ---------------------------------------------------------------------------
-- 8. Plain indexes — ix_<table>_<columns>
-- ---------------------------------------------------------------------------
ALTER INDEX "identity"."app_user_organizationId_idx" RENAME TO "ix_app_users_organization_id";
ALTER INDEX "identity"."refresh_token_userId_idx" RENAME TO "ix_refresh_tokens_user_id";
ALTER INDEX "identity"."refresh_token_expiresAt_idx" RENAME TO "ix_refresh_tokens_expires_at";
ALTER INDEX "public"."worksite_organizationId_idx" RENAME TO "ix_worksites_organization_id";
ALTER INDEX "public"."worker_organizationId_idx" RENAME TO "ix_workers_organization_id";
ALTER INDEX "public"."timesheet_worksiteId_idx" RENAME TO "ix_timesheets_worksite_id";
ALTER INDEX "public"."expense_worksiteId_idx" RENAME TO "ix_expenses_worksite_id";

-- ---------------------------------------------------------------------------
-- 9. Foreign keys — fk_<table>_<referenced_table>
--    None of these crosses the identity/public boundary; that separation is
--    upheld by the application, not by the database.
-- ---------------------------------------------------------------------------
ALTER TABLE "identity"."app_users" ADD CONSTRAINT "fk_app_users_organizations"
  FOREIGN KEY ("organization_id") REFERENCES "identity"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "identity"."refresh_tokens" ADD CONSTRAINT "fk_refresh_tokens_app_users"
  FOREIGN KEY ("user_id") REFERENCES "identity"."app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."timesheets" ADD CONSTRAINT "fk_timesheets_worksites"
  FOREIGN KEY ("worksite_id") REFERENCES "public"."worksites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."timesheets" ADD CONSTRAINT "fk_timesheets_workers"
  FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."expenses" ADD CONSTRAINT "fk_expenses_worksites"
  FOREIGN KEY ("worksite_id") REFERENCES "public"."worksites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
