-- `invitations.invited_by_id` becomes a real foreign key.
--
-- It was a bare UUID on purpose: a second relation to `app_users` needs naming
-- on both sides, and that was too much ceremony for an audit field nothing
-- joined on. The invitations screen turned it into something we *do* join on —
-- once per page, to show who sent each one — so the reason expired.
--
-- Two deliberate choices in the constraint below:
--
--   - **NULLable.** An invitation outlives the admin who sent it and then left.
--     The column has no NULLs today, so dropping NOT NULL cannot fail.
--   - **ON DELETE SET NULL, never CASCADE.** Deleting a manager must not take
--     somebody else's pending invitation with it — that would revoke access for
--     a person who has nothing to do with the departure. The screen already
--     reads a missing inviter as "—".
--
-- Both tables live in `identity`, so this crosses no context boundary: the rule
-- is that no foreign key leaves the schema, not that there are none inside it.

ALTER TABLE "identity"."invitations" ALTER COLUMN "invited_by_id" DROP NOT NULL;

-- Rows pointing at an account that no longer exists would refuse the constraint.
-- There should be none — nothing deleted admins before today — but the
-- invitations of a hard-deleted user would have gone with them via the cascade
-- on `user_id`, not this column, so this is cheap insurance rather than a guess.
UPDATE "identity"."invitations" i
   SET "invited_by_id" = NULL
 WHERE i."invited_by_id" IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM "identity"."app_users" u WHERE u."id" = i."invited_by_id");

ALTER TABLE "identity"."invitations"
    ADD CONSTRAINT "fk_invitations_invited_by"
    FOREIGN KEY ("invited_by_id") REFERENCES "identity"."app_users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- The screen filters and joins on it; the constraint alone does not index it.
CREATE INDEX "ix_invitations_invited_by_id" ON "identity"."invitations" ("invited_by_id");
