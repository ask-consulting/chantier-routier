-- Data migration: seed the default tenant organization "ELLOUZE construction".
-- The id is a FIXED UUID so the same organization id is shared across every
-- environment (local, staging, production) — this keeps seeded references stable.
-- Idempotent: re-running does nothing (ON CONFLICT on the primary key).
-- `id` and `updatedAt` have no DB-level default (Prisma sets them in the app),
-- so we provide them explicitly here.
INSERT INTO "organization" ("id", "name", "currency", "createdAt", "updatedAt")
VALUES (
    'b62107ee-2174-463f-9365-1fa967cc1925',
    'ELLOUZE construction',
    'EUR',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;
