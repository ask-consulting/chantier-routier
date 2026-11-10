-- Who works on a task, and how they are paid for it. The same worker can be
-- paid by the task here and by the day there: the mode belongs to the
-- assignment, not to the worker. The rate is frozen when the assignment is
-- made, in the currency's smallest unit: per hour, per day, or for the whole
-- task.
CREATE TYPE "public"."pay_mode" AS ENUM ('task', 'day', 'hour');

CREATE TABLE "public"."task_workers" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "worksite_task_id" UUID NOT NULL,
  "worker_id" UUID NOT NULL,
  "pay_mode" "public"."pay_mode" NOT NULL,
  "rate" BIGINT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pk_task_workers" PRIMARY KEY ("id"),
  CONSTRAINT "fk_task_workers_worksite_tasks" FOREIGN KEY ("worksite_task_id") REFERENCES "public"."worksite_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "fk_task_workers_workers" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE NO ACTION ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "uq_task_workers_worksite_task_id_worker_id" ON "public"."task_workers"("worksite_task_id", "worker_id");
CREATE INDEX "ix_task_workers_organization_id" ON "public"."task_workers"("organization_id");
CREATE INDEX "ix_task_workers_worker_id" ON "public"."task_workers"("worker_id");

-- Which of the machines booked on the worksite work on a task. The booking
-- keeps its dates and its cost: this only says what it is for.
CREATE TABLE "public"."task_equipment" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "worksite_task_id" UUID NOT NULL,
  "equipment_assignment_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pk_task_equipment" PRIMARY KEY ("id"),
  CONSTRAINT "fk_task_equipment_worksite_tasks" FOREIGN KEY ("worksite_task_id") REFERENCES "public"."worksite_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "fk_task_equipment_equipment_assignments" FOREIGN KEY ("equipment_assignment_id") REFERENCES "public"."equipment_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "uq_task_equipment_worksite_task_id_equipment_assignment_id" ON "public"."task_equipment"("worksite_task_id", "equipment_assignment_id");
CREATE INDEX "ix_task_equipment_organization_id" ON "public"."task_equipment"("organization_id");
CREATE INDEX "ix_task_equipment_equipment_assignment_id" ON "public"."task_equipment"("equipment_assignment_id");
