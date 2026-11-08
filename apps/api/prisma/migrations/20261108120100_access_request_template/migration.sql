-- French only: this message goes to the Chantia team, not to the prospect.
-- Placeholders: {{company}} {{phone}} {{kind}} {{locale}}
INSERT INTO "notification"."notification_templates"
    ("subject", "channel", "locale", "subject_line", "body", "updated_at")
VALUES
    ('access_request', 'email', 'fr',
     'Nouvelle demande d''accès : {{company}}',
     E'Une entreprise demande l''accès à Chantia depuis la vitrine.\n\nEntreprise : {{company}}\nTéléphone : {{phone}}\nType de chantiers : {{kind}}\nLangue de la page : {{locale}}',
     CURRENT_TIMESTAMP);
