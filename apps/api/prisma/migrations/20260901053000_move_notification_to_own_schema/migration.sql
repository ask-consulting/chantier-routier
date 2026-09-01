-- Moves the notification module into a Postgres schema of its own.
--
-- It was created in `public` alongside the business tables. It belongs beside
-- `identity` instead, for the reason that schema exists at all: delivery is not
-- business data, the module is meant to become its own service, and one
-- `pg_dump -n notification` has to carry all of it. Nothing references it and it
-- references nothing — the recipient arrives as plain data at send time — so the
-- boundary costs nothing to draw.
--
-- MOVED, not dropped and recreated. `20260828090000` already ran on every
-- database that has it, seeded rows included; re-creating the table would throw
-- the four templates away and re-seed them under new ids. `SET SCHEMA` carries
-- the rows, the primary key, the unique index and the enum values across
-- untouched — the same technique `20260805204448` used to move `organizations`
-- into `identity` (see docs/10 §4).

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "notification";

-- The types move before the table that uses them: a column keeps pointing at its
-- type through the move, so the order is a readability choice, not a constraint.
ALTER TYPE "public"."notification_subject" SET SCHEMA "notification";
ALTER TYPE "public"."notification_channel" SET SCHEMA "notification";
ALTER TYPE "public"."notification_locale"  SET SCHEMA "notification";

-- Indexes and constraints follow their table; nothing to rename, since the names
-- carried no schema in them.
ALTER TABLE "public"."notification_templates" SET SCHEMA "notification";
