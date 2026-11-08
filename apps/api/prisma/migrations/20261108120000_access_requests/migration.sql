-- Access requests from the public showcase.
--
-- The new subject value cannot be used in the transaction that adds it, so its
-- template is seeded by the next migration.
ALTER TYPE "notification"."notification_subject" ADD VALUE 'access_request';

CREATE TYPE "public"."access_request_kind" AS ENUM ('building', 'roads', 'networks', 'earthworks', 'other');
CREATE TYPE "public"."access_request_locale" AS ENUM ('ar', 'la', 'fr');

CREATE TABLE "public"."access_requests" (
    "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
    "company"    TEXT NOT NULL,
    "phone"      TEXT NOT NULL,
    "kind"       "public"."access_request_kind" NOT NULL,
    "locale"     "public"."access_request_locale" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_access_requests" PRIMARY KEY ("id")
);

CREATE INDEX "ix_access_requests_created_at" ON "public"."access_requests" ("created_at");
