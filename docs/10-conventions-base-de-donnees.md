# 10 — Conventions de nommage en base

> Inspiré des conventions de `cie-next` (`docs/architecture/database-conventions.md`),
> adapté à ce projet : trois schémas Postgres, pas de traduction, pas de champs de
> migration legacy, et des identifiants UUID plutôt que CUID.
>
> **Règle générale : la base parle `snake_case`, le code parle `camelCase`.** Prisma
> fait le pont avec `@@map` et `@map`, donc les deux mondes restent idiomatiques
> chacun chez soi.

## 1. Nommage général

| Élément | Convention | Exemple |
|---|---|---|
| Table | `snake_case`, **pluriel** | `worksites`, `app_users`, `refresh_tokens` |
| Colonne | `snake_case` | `organization_id`, `planned_start_date` |
| Type enum | `snake_case`, singulier | `user_role`, `worksite_status` |
| Modèle Prisma | `PascalCase`, singulier | `Worksite`, `User`, `RefreshToken` |
| Champ Prisma | `camelCase` | `organizationId`, `plannedStartDate` |

**Pourquoi `snake_case` en base.** Postgres replie tout identifiant non quoté en
minuscules. Une colonne `organizationId` doit donc être citée *partout* :

```sql
SELECT organizationId FROM worksites;   -- ERREUR : column "organizationid" does not exist
SELECT "organization_id" FROM worksites; -- inutile de citer : ça marche sans
```

Chaque export, chaque script psql, chaque requête d'analyse en dépendait. Le `@map`
supprime le problème une bonne fois.

**Pourquoi le pluriel.** Une table contient des lignes, pas une ligne — et c'est la
convention de `cie-next`, ce qui évite d'avoir à changer de réflexe en passant d'un
projet à l'autre. Le modèle Prisma, lui, reste au singulier : il représente *une*
entité.

## 2. Contraintes et index

| Type | Préfixe | Motif | Exemple |
|---|---|---|---|
| Clé primaire | `pk_` | `pk_<table>` | `pk_worksites` |
| Clé étrangère | `fk_` | `fk_<table>_<table_référencée>` | `fk_timesheets_worksites` |
| Index unique | `uq_` | `uq_<table>_<colonnes>` | `uq_app_users_email` |
| Index | `ix_` | `ix_<table>_<colonnes>` | `ix_worksites_organization_id` |

Les noms par défaut de Prisma (`worksite_pkey`, `app_user_organizationId_idx`) sont
mi-camel mi-snake et ne disent pas de quel type de contrainte il s'agit. Un préfixe
explicite rend les messages d'erreur Postgres lisibles :

```
ERROR: duplicate key value violates unique constraint "uq_app_users_email"
```

On sait immédiatement : table `app_users`, contrainte d'unicité, colonne `email`.

Quand plusieurs clés étrangères pointent vers la même table, on désambiguïse en
suffixant la colonne :

```
fk_timesheets_worksites
fk_timesheets_workers
fk_timesheets_app_users_validated_by   -- si un jour deux FK visaient app_users
```

Composite : on enchaîne les colonnes dans l'ordre de l'index.

```
uq_timesheets_worker_id_worksite_id_date
```

## 3. Clés primaires

**UUID v4, stocké en type `uuid` natif.**

```prisma
id String @id(map: "pk_worksites") @default(uuid()) @db.Uuid
```

Pourquoi pas `autoincrement()` : des lignes arrivent de plusieurs sources (API,
imports, futur mobile hors-ligne). Un entier auto-incrémenté force un aller-retour
serveur pour connaître l'id, et provoque des collisions entre sources.

Pourquoi pas `cuid()` comme `cie-next` : nos identifiants voyagent déjà en UUID dans
les URL, les tokens et les références molles inter-contextes, et une migration de seed
fixe un UUID en dur. Le `@db.Uuid` apporte en plus 16 octets au lieu de 36 caractères
de texte — index plus compacts, comparaisons plus rapides — et une **validation par la
base** : une chaîne malformée est rejetée, elle ne peut plus s'insérer silencieusement.

## 4. Clés étrangères

`onDelete` est **toujours** explicite. Le défaut silencieux de Prisma est un piège :
il varie selon que le champ est optionnel ou non.

| Cas | `onDelete` | Raison |
|---|---|---|
| L'enfant n'a aucun sens sans son parent | `Cascade` | Un pointage sans chantier n'existe pas |
| Le parent est une référence partagée | `Restrict` | Bloquer la suppression d'un référentiel encore utilisé |

```prisma
worksite Worksite @relation(fields: [worksiteId], references: [id], onDelete: Cascade, map: "fk_timesheets_worksites")
```

### Aucune clé étrangère ne traverse les contextes

La base a trois espaces Postgres, un par contexte : `identity` (organisations,
comptes, sessions), `notification` (templates d'envoi) et `public` (métier).
**Aucune FK ne les relie.** `worksites.organization_id` et
`app_users.worker_id` sont des UUID opaques, exactement comme au travers d'un appel
réseau — c'est ce qui garde chaque contexte extractible en service autonome
(`pg_dump -n identity`, `pg_dump -n notification`).
L'intégrité entre contextes est le travail de l'application.

**À l'intérieur d'un contexte, en revanche, les clés étrangères sont la règle.**
La contrainte porte sur la frontière, pas sur le nombre de relations : deux
tables du même schéma se lient normalement — `invitations.invited_by_id` →
`app_users.id` en est un exemple, ajouté le 2 septembre 2026 après avoir vécu
comme un identifiant nu. Un champ qu'on finit par joindre à chaque affichage
mérite sa relation ; la garder implicite ne fait qu'en déplacer le coût dans une
seconde requête.

## 5. Colonnes systématiques

```prisma
createdAt DateTime @default(now()) @map("created_at")
updatedAt DateTime @updatedAt      @map("updated_at")
```

Toute entité métier les porte. Les tables de liaison pure n'en ont pas : elles suivent
le cycle de vie de leur parent.

**Multi-tenant** — toute table métier porte :

```prisma
organizationId String @map("organization_id") @db.Uuid
@@index([organizationId], map: "ix_<table>_organization_id")
```

L'index n'est pas optionnel : **chaque** requête métier filtre dessus. Et la présence de
cette colonne fait basculer la table dans le champ du filtre automatique — voir
`09-multi-tenant.md`.

## 6. Ce qu'on ne reprend pas de cie-next

| Convention cie-next | Ici | Pourquoi |
|---|---|---|
| `cuid()` | `uuid()` + `@db.Uuid` | Voir §3 |
| Soft delete `deleted_at` | **la règle**, depuis le 3 septembre 2026 | Toute entité métier qui peut être référencée ailleurs (des pointages, un budget, un historique) porte un `deletedAt: DateTime?` et n'est **jamais** vraiment supprimée — `DELETE` devient `UPDATE … SET deleted_at = now()`. `workers` l'a le premier : un vrai `DELETE` y cascaderait sur `timesheets` et effacerait, en silence, le coût main-d'œuvre de chantiers déjà clôturés. La discipline que ça impose est réelle — `deletedAt: null` dans *chaque* lecture, un oubli devient une fuite de données supprimées — mais elle coûte moins cher qu'un historique de coût qui change de valeur sans qu'on sache pourquoi. `active: boolean` reste à côté là où il existe déjà (`workers`, `app_users`) : c'est un état **volontaire et réversible** (en congé, compte désactivé), pas la même chose qu'une suppression. |
| Tables de traduction | absent | Produit monolingue (français). Pas de table de traduction, pas de JSONB. |
| `legacy_id`, `source_checksum` | absent | Pas de base historique à migrer. |

## 7. Écrire un nouveau modèle

```prisma
model BudgetLine {
  id             String   @id(map: "pk_budget_lines") @default(uuid()) @db.Uuid
  organizationId String   @map("organization_id") @db.Uuid
  worksiteId     String   @map("worksite_id") @db.Uuid
  label          String
  plannedAmount  Decimal  @map("planned_amount") @db.Decimal(14, 2)
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  worksite Worksite @relation(fields: [worksiteId], references: [id], onDelete: Cascade, map: "fk_budget_lines_worksites")

  @@index([organizationId], map: "ix_budget_lines_organization_id")
  @@index([worksiteId], map: "ix_budget_lines_worksite_id")
  @@map("budget_lines")
  @@schema("public")
}
```

Check-list :

- [ ] `@@map` au pluriel, `@@schema` explicite
- [ ] `@map("snake_case")` sur **toute** colonne dont le nom Prisma n'est pas déjà en un seul mot
- [ ] `@id(map: "pk_…")`, `@unique(map: "uq_…")`, `@@index(…, map: "ix_…")`, `map: "fk_…"` sur chaque relation
- [ ] `@db.Uuid` sur l'id et sur toute colonne qui référence un id
- [ ] `organizationId` + son index si la table est métier
- [ ] `onDelete` explicite sur chaque relation
- [ ] `created_at` / `updated_at`

## 8. Renommer sans perdre les données

**Prisma ne sait pas renommer.** Il compare deux états et voit « une table inconnue est
apparue, une table connue a disparu » : il génère un `DROP TABLE` + `CREATE TABLE`, qui
efface toutes les lignes.

La parade, utilisée pour la migration `20260806135257_apply_db_naming_conventions` :

1. Modifier `schema.prisma`.
2. Créer le dossier de migration **à la main**, et y écrire du SQL de renommage
   (`ALTER TABLE … RENAME`, `ALTER … RENAME COLUMN`, `ALTER INDEX … RENAME TO`).
3. Vérifier que le résultat correspond exactement à ce qu'attend Prisma :

```bash
pnpm exec prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma \
  --shadow-database-url "postgresql://…/chantia_shadow" \
  --script
# doit répondre : -- This is an empty migration.
```

4. Appliquer avec `prisma migrate deploy`.

Cette vérification est le point important : elle prouve que le SQL manuel produit le
même schéma que celui déduit du modèle, sans quoi la prochaine migration générée
partirait d'un état divergent.

> La migration `20260805204448_add_identity_context` emploie la même technique pour
> **déplacer** `organization` du schéma `public` vers `identity`
> (`ALTER TABLE … SET SCHEMA`) au lieu de la recréer.
