-- `workers.deleted_at` — the project's one deliberate exception to the
-- "no generalised soft delete" rule (docs/10 §5).
--
-- A real DELETE on a worker would cascade onto `timesheets` and erase the
-- hours with it, silently rewriting the labour cost of every worksite that
-- worker appeared on. `active` already exists but means something else — a
-- reversible, voluntary state ("on leave") the admin sets by hand — so it
-- cannot double as "removed via the delete button" without conflating the
-- two. Hence a second, purpose-built column.
--
-- `null` means current. Every read that lists or looks up a worker filters
-- on it — the discipline docs/10 §5 warns a generalised soft delete demands,
-- paid here because the alternative (an actual row delete) is worse: it would
-- take the audit trail down with it.

ALTER TABLE "public"."workers" ADD COLUMN "deleted_at" TIMESTAMP(3);
