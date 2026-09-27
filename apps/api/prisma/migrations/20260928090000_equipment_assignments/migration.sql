-- A machine on a worksite for a fixed period — what puts the machine's daily
-- cost into the worksite's cost.

CREATE TABLE "public"."equipment_assignments" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "equipment_id" UUID NOT NULL,
    "worksite_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pk_equipment_assignments" PRIMARY KEY ("id"),
    -- The API refuses it first; the database has the last word. Prisma does
    -- not model check constraints and leaves this one alone.
    CONSTRAINT "ck_equipment_assignments_period" CHECK ("end_date" >= "start_date")
);

CREATE INDEX "ix_equipment_assignments_organization_id"
  ON "public"."equipment_assignments"("organization_id");
-- The overlap check reads a machine's assignments by date.
CREATE INDEX "ix_equipment_assignments_equipment_id_start_date"
  ON "public"."equipment_assignments"("equipment_id", "start_date");
CREATE INDEX "ix_equipment_assignments_worksite_id"
  ON "public"."equipment_assignments"("worksite_id");

-- NO ACTION: machines and worksites are soft-deleted, so a real DELETE of
-- either is never issued — and if one were, it must fail rather than erase
-- the other side's history.
ALTER TABLE "public"."equipment_assignments"
  ADD CONSTRAINT "fk_equipment_assignments_equipment" FOREIGN KEY ("equipment_id")
  REFERENCES "public"."equipment"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "public"."equipment_assignments"
  ADD CONSTRAINT "fk_equipment_assignments_worksites" FOREIGN KEY ("worksite_id")
  REFERENCES "public"."worksites"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
