-- Progress is entered on the lowest lines of a planning, from 0 to 100; the
-- lines above take theirs from them. Nothing to convert: every line starts at 0.
ALTER TABLE "public"."worksite_tasks" ADD COLUMN "progress" INTEGER NOT NULL DEFAULT 0;

-- Who works on a worksite. An admin sees every worksite; everybody else, the
-- ones they are a member of. `user_id` refers to `identity.app_users` without a
-- foreign key, as every reference across contexts does (docs/10).
CREATE TABLE "public"."worksite_members" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "worksite_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pk_worksite_members" PRIMARY KEY ("id"),
  CONSTRAINT "fk_worksite_members_worksites" FOREIGN KEY ("worksite_id") REFERENCES "public"."worksites"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "uq_worksite_members_worksite_id_user_id" ON "public"."worksite_members"("worksite_id", "user_id");
CREATE INDEX "ix_worksite_members_organization_id" ON "public"."worksite_members"("organization_id");
CREATE INDEX "ix_worksite_members_user_id" ON "public"."worksite_members"("user_id");
