-- Notification module: subjects, channels, and the template table.
--
-- Templates are seeded here and only here. A template is a contract between the
-- code that fills placeholders and the text that reads them; editing it at
-- runtime would let the two drift with nothing to catch it. Adding a subject is
-- therefore an enum value plus a migration, which is the point.

CREATE TYPE "public"."notification_subject" AS ENUM ('invitation');
CREATE TYPE "public"."notification_channel" AS ENUM ('email', 'sms');
CREATE TYPE "public"."notification_locale"  AS ENUM ('fr', 'ar');

CREATE TABLE "public"."notification_templates" (
    "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
    "subject"      "public"."notification_subject" NOT NULL,
    "channel"      "public"."notification_channel" NOT NULL,
    "locale"       "public"."notification_locale"  NOT NULL,
    -- NULL on channels that carry no subject line (SMS).
    "subject_line" TEXT,
    "body"         TEXT NOT NULL,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pk_notification_templates" PRIMARY KEY ("id")
);

-- One template per (subject, channel, locale). The constraint is what makes a
-- missing translation impossible to add by accident rather than merely unlikely.
CREATE UNIQUE INDEX "uq_notification_templates_subject_channel_locale"
    ON "public"."notification_templates" ("subject", "channel", "locale");

-- Placeholders: {{firstName}} {{organizationName}} {{invitationUrl}} {{expiresAt}}
-- French and Arabic together from the start (docs/14 §5.2): the account already
-- carries its language, and adding the second one later means re-editing each row.
--
-- One E'' literal per body. Postgres concatenates adjacent string constants
-- separated by a newline, but only the first may carry the E prefix — writing
-- E'…' E'…' is a syntax error, which is why this is one line per template.
INSERT INTO "public"."notification_templates"
    ("subject", "channel", "locale", "subject_line", "body", "updated_at")
VALUES
    ('invitation', 'email', 'fr',
     'Vous êtes invité à rejoindre {{organizationName}} sur Chantia',
     E'Bonjour {{firstName}},\n\n{{organizationName}} vous invite à rejoindre Chantia.\n\nPour choisir votre mot de passe et activer votre compte :\n{{invitationUrl}}\n\nCe lien expire le {{expiresAt}}. Passé ce délai, demandez une nouvelle invitation.\n\nSi vous n''attendiez pas cette invitation, ignorez ce message.\n\n— L''équipe Chantia',
     CURRENT_TIMESTAMP),

    ('invitation', 'email', 'ar',
     'تمت دعوتك للانضمام إلى {{organizationName}} على Chantia',
     E'مرحبا {{firstName}}،\n\nتدعوك {{organizationName}} للانضمام إلى Chantia.\n\nلاختيار كلمة المرور وتفعيل حسابك:\n{{invitationUrl}}\n\nتنتهي صلاحية هذا الرابط في {{expiresAt}}. بعد ذلك، اطلب دعوة جديدة.\n\nإذا لم تكن تتوقع هذه الدعوة، فتجاهل هذه الرسالة.\n\n— فريق Chantia',
     CURRENT_TIMESTAMP),

    -- The SMS channel exists in the table before anything can send it. Filling it
    -- now costs one row; back-filling it later means re-editing every template.
    ('invitation', 'sms', 'fr', NULL,
     '{{organizationName}} vous invite sur Chantia. Activez votre compte : {{invitationUrl}} (expire le {{expiresAt}})',
     CURRENT_TIMESTAMP),

    ('invitation', 'sms', 'ar', NULL,
     'تدعوك {{organizationName}} إلى Chantia. فعّل حسابك: {{invitationUrl}} (ينتهي في {{expiresAt}})',
     CURRENT_TIMESTAMP);
