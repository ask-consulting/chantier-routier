-- Introduces the Identity bounded context: its own Postgres schema, its accounts
-- and its refresh sessions.
--
-- Hand-written rather than generated, on one point: `organization` already exists
-- in `public` and holds live rows that every worksite references by id. The
-- generated migration would DROP and re-CREATE it, losing the tenants. It is
-- MOVED instead — `ALTER TABLE ... SET SCHEMA` carries the rows, the primary key
-- and the indexes across untouched.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "identity";

-- CreateEnum
CREATE TYPE "identity"."UserRole" AS ENUM ('admin', 'site_manager', 'foreman', 'worker');

-- DropForeignKey
-- No foreign key may cross the context boundary: business rows now hold
-- `organizationId` as an opaque UUID, exactly as they would across a network
-- call. Integrity between contexts becomes the application's job.
ALTER TABLE "public"."worksite" DROP CONSTRAINT "worksite_organizationId_fkey";
ALTER TABLE "public"."worker" DROP CONSTRAINT "worker_organizationId_fkey";

-- MoveTable (data-preserving equivalent of the generated DROP + CREATE)
ALTER TABLE "public"."organization" SET SCHEMA "identity";

-- CreateTable
CREATE TABLE "identity"."app_user" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "identity"."UserRole" NOT NULL DEFAULT 'worker',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "workerId" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."refresh_token" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedBy" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_user_email_key" ON "identity"."app_user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "app_user_workerId_key" ON "identity"."app_user"("workerId");

-- CreateIndex
CREATE INDEX "app_user_organizationId_idx" ON "identity"."app_user"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_token_tokenHash_key" ON "identity"."refresh_token"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_token_userId_idx" ON "identity"."refresh_token"("userId");

-- CreateIndex
-- Supports the housekeeping delete of tokens that can no longer be used.
CREATE INDEX "refresh_token_expiresAt_idx" ON "identity"."refresh_token"("expiresAt");

-- AddForeignKey
-- Both stay strictly inside the identity schema.
ALTER TABLE "identity"."app_user" ADD CONSTRAINT "app_user_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "identity"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."refresh_token" ADD CONSTRAINT "refresh_token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "identity"."app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
