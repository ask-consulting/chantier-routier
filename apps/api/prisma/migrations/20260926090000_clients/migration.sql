-- The client module: a client file (person or legal entity), its contacts, a
-- structured billing address — and worksites pointing at it instead of
-- carrying the client's name as free text.

CREATE TYPE "public"."client_type" AS ENUM ('individual', 'legal_entity');

CREATE TABLE "public"."clients" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "type" "public"."client_type" NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "legal_name" TEXT,
    "display_name" TEXT NOT NULL,
    "billing_line1" TEXT,
    "billing_line2" TEXT,
    "billing_postal_code" TEXT,
    "billing_city" TEXT,
    "billing_country" CHAR(2) NOT NULL DEFAULT 'TN',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pk_clients" PRIMARY KEY ("id")
);

CREATE TABLE "public"."client_contacts" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT NOT NULL,
    "position" TEXT,
    "mobile_phone" TEXT,
    "landline_phone" TEXT,
    "email" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pk_client_contacts" PRIMARY KEY ("id")
);

CREATE INDEX "ix_clients_organization_id" ON "public"."clients"("organization_id");
CREATE INDEX "ix_client_contacts_client_id" ON "public"."client_contacts"("client_id");

ALTER TABLE "public"."client_contacts"
  ADD CONSTRAINT "fk_client_contacts_clients" FOREIGN KEY ("client_id")
  REFERENCES "public"."clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Worksites: from a free-text name to a reference.
ALTER TABLE "public"."worksites" ADD COLUMN "client_id" UUID;

-- Carry the existing names over rather than drop them: one client per distinct
-- name within an organization, so two worksites for "Mairie de Sousse" end up
-- on the same client. Created as legal entities — a road worksite is almost
-- always built for a municipality, a ministry or a company; an individual can
-- be retyped from the screen. Blank names are not carried over.
INSERT INTO "public"."clients"
  ("id", "organization_id", "type", "legal_name", "display_name", "created_at", "updated_at")
SELECT gen_random_uuid(), s."organization_id", 'legal_entity', s."name", s."name",
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  FROM (
    SELECT DISTINCT "organization_id", btrim("client") AS "name"
      FROM "public"."worksites"
     WHERE "client" IS NOT NULL AND btrim("client") <> ''
  ) s;

UPDATE "public"."worksites" w
   SET "client_id" = c."id"
  FROM "public"."clients" c
 WHERE c."organization_id" = w."organization_id"
   AND c."legal_name" = btrim(w."client");

ALTER TABLE "public"."worksites" DROP COLUMN "client";

CREATE INDEX "ix_worksites_client_id" ON "public"."worksites"("client_id");

-- NO ACTION, not CASCADE: clients are soft-deleted, so a real DELETE is never
-- issued — and if one ever were, it must fail rather than take worksites with it.
ALTER TABLE "public"."worksites"
  ADD CONSTRAINT "fk_worksites_clients" FOREIGN KEY ("client_id")
  REFERENCES "public"."clients"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
