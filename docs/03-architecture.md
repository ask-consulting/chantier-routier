# 03 — Architecture technique

> Principes directeurs : **une seule base de code partagée** autant que possible,
> **mobile-first**, **hors-ligne d'abord** pour le terrain, **coûts d'infra proches de zéro**
> au démarrage (voir [`04-deploiement-gratuit.md`](04-deploiement-gratuit.md)).

## 1. Vue d'ensemble

```
┌─────────────────────┐      ┌─────────────────────┐
│   App Mobile        │      │   App Web           │
│   (React Native /   │      │   (React / Next.js) │
│    Expo)            │      │   Direction &       │
│   Chef chantier,    │      │   conducteur        │
│   ouvrier, terrain  │      │   (bureau)          │
└──────────┬──────────┘      └──────────┬──────────┘
           │  HTTPS / REST (JSON)        │
           │  + file d'attente offline   │
           └──────────────┬──────────────┘
                          ▼
              ┌───────────────────────┐
              │   API Back-end        │
              │   (Node/NestJS ou     │
              │    Supabase)          │
              │   Auth, règles métier │
              └───────────┬───────────┘
                          ▼
              ┌───────────────────────┐
              │  PostgreSQL           │
              │  + Stockage fichiers  │
              │    (photos factures)  │
              └───────────────────────┘
```

## 2. Choix technologiques recommandés

### Option A — « Rapide MVP » (recommandée pour démarrer) ⭐

Minimise le back-end à écrire, idéale pour tester vite et gratuitement.

| Couche | Techno | Pourquoi |
|---|---|---|
| **Back-end + BDD + Auth + Stockage** | **Supabase** (PostgreSQL managé, Auth, Storage, Row Level Security) | Tout-en-un, généreux free tier, temps réel, RLS pour les permissions |
| **Web** | **Next.js (React) + TypeScript** | SSR, rapide, déploiement gratuit (Vercel) |
| **Mobile** | **Expo (React Native) + TypeScript** | iOS + Android depuis une base, build cloud gratuit (EAS), OTA updates |
| **Hors-ligne mobile** | **WatermelonDB** ou **SQLite (expo-sqlite) + file de sync** | Base locale, sync différée |
| **UI** | Tailwind (web) / NativeWind (mobile) | Composants cohérents web ↔ mobile |
| **État/données** | TanStack Query + Zustand | Cache, sync serveur, offline |

> Avec Supabase, une bonne partie de l'« API » est générée (PostgREST) ; on ajoute des
> **Edge Functions** pour la logique sensible (calcul de coûts, validation pointage).

### Option B — « Contrôle total » (si logique métier lourde)

| Couche | Techno |
|---|---|
| Back-end | **NestJS (Node + TS)** API REST, Prisma ORM |
| BDD | PostgreSQL (Neon / Supabase / Railway) |
| Auth | JWT + refresh, ou Clerk/Auth0 free |
| Web | Next.js |
| Mobile | Expo |

**Recommandation : commencer par l'Option A**, migrer vers B seulement si la logique
métier devient trop complexe pour les Edge Functions.

> **Décision (2026-07) : Option B retenue (API dédiée).** Les calculs métier (coûts,
> validation pointage, exports) arrivent tôt ; on veut les tester unitairement et les
> partager avec le mobile. On garde donc **Supabase pour Postgres + Auth + Storage** et on
> ajoute une **API NestJS** (`apps/api`) en **DDD/CQRS + Prisma**. Conventions détaillées
> dans [`06-api-conventions-ddd-cqrs.md`](06-api-conventions-ddd-cqrs.md). Les fonctions de
> calcul pures vivent dans `packages/shared` et sont réutilisées par web et mobile.

## 3. Partage de code web ↔ mobile

- **TypeScript partout** : un package partagé `packages/shared` (types, schémas Zod,
  règles de calcul de coûts, constantes) consommé par web et mobile → **monorepo**
  (pnpm workspaces ou Turborepo).
- UI **non partagée** (web = React DOM, mobile = React Native) mais **logique et types partagés**.

```
chantier-routier/
├── apps/
│   ├── web/        # Next.js
│   └── mobile/     # Expo
├── packages/
│   └── shared/     # types, validation (zod), calculs métier
└── docs/
```

## 4. Stratégie hors-ligne (critique pour le terrain)

1. Toute écriture terrain (pointage, dépense) est **d'abord écrite en local** (SQLite/WatermelonDB).
2. Chaque opération reçoit un **UUID client** et un statut `pending`.
3. Un **worker de sync** pousse les opérations en attente dès que le réseau revient.
4. **Résolution de conflits** : « last-write-wins » par champ pour le MVP, horodatage serveur
   faisant foi ; les pointages sont idempotents (clé unique ouvrier+chantier+date).
5. Les photos de factures sont mises en file et uploadées séparément (upload résiliant).

## 5. Modèle de données (schéma logique)

```sql
-- Multi-entreprise (multi-tenant) dès le départ, isolé par organisation
organisation(id, nom, devise, created_at)

utilisateur(id, org_id, nom, email, telephone, role, taux_horaire?, actif)
  role ∈ {admin, conducteur, chef_chantier, ouvrier}

chantier(id, org_id, code, nom, client, adresse, lat, lng,
         date_debut_prev, date_fin_prev, statut, budget_total)
  statut ∈ {a_venir, en_cours, termine, suspendu}

poste_budget(id, chantier_id, libelle, budget_prevu)     -- ex: terrassement, enrobé

depense(id, chantier_id, poste_id?, type, libelle, montant, devise,
        date, fournisseur, piece_jointe_url, cree_par, created_at)
  type ∈ {main_oeuvre, materiaux, engin, sous_traitance, divers}

ouvrier(id, org_id, nom, telephone, qualification, taux_horaire, actif)
  -- peut être un utilisateur (rôle ouvrier) ou une simple fiche

affectation(id, chantier_id, ouvrier_id, date_debut, date_fin?)

pointage(id, chantier_id, ouvrier_id, date, heure_debut?, heure_fin?,
         nb_heures, present, lat, lng, statut, cree_par, uuid_client, synced_at)
  statut ∈ {brouillon, valide, verrouille}
  UNIQUE(ouvrier_id, chantier_id, date)

tache_planning(id, chantier_id, libelle, date_debut, date_fin,
               avancement_pct, statut)

tache_affectation(id, tache_id, ouvrier_id?)
```

**Coût main d'œuvre (calcul, côté serveur/Edge Function) :**
```
cout_mo(chantier) = Σ pointage.nb_heures × ouvrier.taux_horaire
cout_reel(chantier) = cout_mo + Σ depense.montant
```

## 6. Sécurité

> **Implémenté** — voir `08-identity-module.md` pour le détail. Deux écarts par rapport
> au plan initial ci-dessous : l'authentification est **maison** (contexte Identity,
> JWT + refresh tokens rotatifs) plutôt que Supabase Auth, parce que la logique métier
> vit déjà dans l'API NestJS ; et l'isolation multi-tenant est appliquée **dans les
> handlers** plutôt que par RLS Postgres, l'API se connectant avec un rôle unique.

- **Auth** : email/mot de passe (OTP SMS pour ouvriers sans email : non fait).
- **Multi-tenant** : isolation stricte par `organizationId`, tiré du token d'accès
  vérifié et appliqué par chaque query handler.
- **RBAC** : permissions par rôle vérifiées côté serveur (jamais uniquement client) —
  matrice `ROLE_PERMISSIONS` partagée entre API, web et mobile.
- **HTTPS** partout, secrets via variables d'environnement.
- **RGPD** : données personnelles ouvriers minimales, consentement, droit à l'effacement.
- Sauvegardes BDD automatiques (fournies par Supabase/Neon).

## 7. Observabilité (léger au MVP)

- Logs API + erreurs mobiles via **Sentry** (free tier).
- Analytics produit basique (PostHog free) pour mesurer l'adoption.

## 8. API — principaux endpoints (logique)

```
POST   /auth/login
GET    /chantiers                 # liste (filtrée par org + rôle)
POST   /chantiers
GET    /chantiers/:id             # détail + budget vs réel
POST   /chantiers/:id/depenses
POST   /chantiers/:id/pointages   # accepte un lot (sync offline)
POST   /pointages/valider         # verrouille une période
GET    /ouvriers
POST   /ouvriers
GET    /dashboard                 # KPIs direction
GET    /exports/pointage.csv      # export paie
```

Voir le plan de déploiement gratuit dans [`04-deploiement-gratuit.md`](04-deploiement-gratuit.md).
