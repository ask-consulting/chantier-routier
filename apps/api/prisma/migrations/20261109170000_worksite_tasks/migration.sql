-- A worksite's own planning: phases, tasks and subtasks. It starts as a copy of
-- a plan of the library, and from then on belongs to the worksite alone.
-- Only the lowest lines hold dates: a phase runs from its first task to its last.

CREATE TABLE "public"."worksite_tasks" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "worksite_id" UUID NOT NULL,
  "parent_id" UUID,
  "level" "public"."plan_node_level" NOT NULL,
  "label" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL,
  "is_control" BOOLEAN NOT NULL DEFAULT false,
  "source_code" TEXT,
  "planned_start" DATE,
  "planned_end" DATE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pk_worksite_tasks" PRIMARY KEY ("id"),
  CONSTRAINT "fk_worksite_tasks_worksites" FOREIGN KEY ("worksite_id") REFERENCES "public"."worksites"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "fk_worksite_tasks_parent" FOREIGN KEY ("parent_id") REFERENCES "public"."worksite_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ix_worksite_tasks_organization_id" ON "public"."worksite_tasks"("organization_id");
CREATE INDEX "ix_worksite_tasks_worksite_id" ON "public"."worksite_tasks"("worksite_id");
CREATE INDEX "ix_worksite_tasks_parent_id" ON "public"."worksite_tasks"("parent_id");
