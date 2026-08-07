-- CreateEnum
CREATE TYPE "identity"."user_locale" AS ENUM ('fr', 'ar');

-- AlterTable
ALTER TABLE "identity"."app_users" ADD COLUMN     "locale" "identity"."user_locale" NOT NULL DEFAULT 'fr',
ALTER COLUMN "password_hash" DROP NOT NULL;

-- CreateTable
CREATE TABLE "identity"."invitations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "invited_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_invitations" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_invitations_token_hash" ON "identity"."invitations"("token_hash");

-- CreateIndex
CREATE INDEX "ix_invitations_user_id" ON "identity"."invitations"("user_id");

-- CreateIndex
CREATE INDEX "ix_invitations_expires_at" ON "identity"."invitations"("expires_at");

-- AddForeignKey
ALTER TABLE "identity"."invitations" ADD CONSTRAINT "fk_invitations_app_users" FOREIGN KEY ("user_id") REFERENCES "identity"."app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

