# 04 — Plan de déploiement 100% gratuit (phase de test)

> Objectif : mettre le MVP en ligne et sur les téléphones des pilotes **sans coût
> d'infrastructure**, en utilisant les offres gratuites (free tiers). Suffisant pour
> quelques chantiers et quelques dizaines d'utilisateurs.

## 1. Stack de déploiement gratuite (recommandée)

| Besoin | Service gratuit | Limite du free tier (ordre d'idée) | Rôle |
|---|---|---|---|
| **BDD + Auth + Stockage** | **Supabase** (Free) | 500 Mo BDD, 1 Go stockage, 50k utilisateurs actifs/mois | PostgreSQL, Auth, fichiers |
| **API back-end (NestJS)** | **Render** (Free Web Service) ⭐ | 512 Mo RAM, s'endort après ~15 min d'inactivité (cold start) | Héberger l'API `apps/api` (Docker/Node) |
| ↳ alternatives API | **Koyeb** (1 service nano gratuit) · **Fly.io** (petite VM, carte requise) · **Railway** (crédit d'essai) | — | Selon besoin (toujours-allumé, régions) |
| **Hébergement Web** | **Vercel** (Hobby) | Suffisant pour usage non commercial/test | Déploiement Next.js |
| **Build & distribution mobile** | **Expo EAS** (Free) | Builds cloud limités/mois | Générer les APK/IPA |
| **Distribution Android (test)** | **APK direct** ou **Firebase App Distribution** / **Expo internal** | Gratuit | Installer sur les téléphones pilotes |
| **Distribution iOS (test)** | **TestFlight** (nécessite compte dev Apple 99$/an) | — | Optionnel : viser Android d'abord |
| **Nom de domaine** | Sous-domaine gratuit Vercel (`*.vercel.app`) | — | URL de test |
| **Suivi erreurs** | **Sentry** (Free) | 5k événements/mois | Debug |
| **Emails transactionnels** | **Brevo** (Free) ⭐ | 300 emails/jour, API HTTP | Invitations, resets — voir [`07`](07-deploiement-render.md) §5 |
| **CI/CD** | **GitHub Actions** (Free) | 2000 min/mois | Tests + déploiement auto |
| **Code** | **GitHub** (Free) | — | Dépôt, monorepo |

> 💡 **Stratégie mobile pour tester gratuitement** : privilégier **Android** (distribution
> d'un APK ou via Expo/Firebase App Distribution, sans frais). iOS demande un compte Apple
> payant (99 $/an) — à reporter après validation du concept.

## 2. Architecture de déploiement

```
   Développeur ──push──► GitHub ──► GitHub Actions
                                        │
       ┌──────────────┬────────────────┼────────────────┬──────────────┐
       ▼              ▼                 ▼                ▼              ▼
  Vercel (Web)   Render (API)     Supabase (BDD)   Expo EAS       (Storage)
  app.vercel.app  NestJS API      Postgres+Auth    → APK Android   Supabase
       │          api.onrender.com  xyz.supabase.co  → Firebase Dist. bucket
       │              │                 ▲                │
       │              └──── Prisma ─────┘                │
       └──────────────► Utilisateurs pilotes ◄──────────┘
```

> L'API NestJS (`apps/api`) se connecte à Postgres Supabase via `DATABASE_URL`
> (utiliser l'URL du **connection pooler** Supabase pour l'app, l'URL directe pour les
> migrations Prisma). Web et mobile appellent l'API en REST ; l'Auth et le Storage
> restent gérés par Supabase.

## 3. Environnements

| Env | Usage | Coût |
|---|---|---|
| **dev (local)** | Développement, Supabase local (Docker) ou projet dev | 0 |
| **staging/test** | Projet Supabase « test » + Vercel preview + APK interne | 0 |
| **prod (pilote)** | Projet Supabase « prod » + domaine Vercel + APK diffusé | 0 |

> Séparer **au moins** les données de test et de production (2 projets Supabase gratuits).

## 4. Étapes de mise en place (checklist)

### Phase 0 — Comptes (tout gratuit)
- [ ] Créer un compte **GitHub** et le dépôt monorepo.
- [ ] Créer un compte **Supabase** + 1 projet `chantia-test`.
- [ ] Créer un compte **Vercel** (connecté à GitHub).
- [ ] Créer un compte **Expo** (EAS).
- [ ] (Option) Compte **Firebase** pour App Distribution.

### Phase 1 — Back-end (API NestJS + Supabase)
- [ ] Projet Supabase créé ; récupérer `DATABASE_URL` (pooler + directe).
- [ ] Modèle de données dans `apps/api/prisma/schema.prisma` (voir `03-architecture.md`).
- [ ] `pnpm --filter @chantia/api prisma:migrate` pour créer les tables.
- [ ] Déployer l'API sur **Render** (Web Service, build depuis le monorepo, `DATABASE_URL` en secret).
- [ ] Activer **Row Level Security** Supabase + policies par `organizationId` et rôle.
- [ ] Créer le **bucket Storage** pour les photos de factures.
- [ ] Logique métier (calcul coûts, validation pointage, exports) **dans l'API** (modules DDD/CQRS).
- [ ] Configurer l'**Auth** Supabase (email + mot de passe, invitations) ; l'API valide le JWT.

### Phase 2 — Web (Vercel)
- [ ] Connecter le dépôt à Vercel (déploiement auto sur `main`).
- [ ] Variables d'env (URL + clés Supabase).
- [ ] Vérifier le déploiement `*.vercel.app`.

### Phase 3 — Mobile (Expo EAS)
- [ ] Configurer `eas.json` (profils `preview` / `production`).
- [ ] `eas build -p android --profile preview` → génère un **APK**.
- [ ] Diffuser l'APK aux pilotes (lien direct ou Firebase App Distribution).
- [ ] (Option) Activer les **OTA updates** pour pousser des correctifs sans re-build.

### Phase 4 — CI/CD
- [ ] GitHub Actions : lint + tests à chaque PR.
- [ ] Déploiement web auto (Vercel le fait nativement).
- [ ] Build mobile déclenché manuellement ou sur tag.

## 5. Coûts (phase de test)

| Poste | Coût mensuel |
|---|---|
| Supabase Free | 0 € |
| Render Free (API) | 0 € |
| Vercel Hobby | 0 € |
| Expo EAS Free | 0 € |
| Firebase App Distribution | 0 € |
| GitHub / Sentry / Brevo Free | 0 € |
| **Total infra** | **0 €** |
| *Optionnel : compte Apple Developer (iOS)* | *~99 $/an* |
| *Optionnel : nom de domaine perso* | *~10-15 €/an* |

## 6. Quand faudra-t-il payer ? (seuils de bascule)

- Base de données Supabase > 500 Mo, ou besoin de sauvegardes longues → **Supabase Pro (~25 $/mois)**.
- **Cold start** de l'API Render gênant (mise en veille après ~15 min) → **Render Starter (~7 $/mois)** toujours-allumé, ou petite VM Fly.io/Hetzner (~5 €/mois).
- Usage web commercial / trafic → **Vercel Pro** ou hébergement VPS (Hetzner ~5 €/mois).
- Publication sur **Google Play** (25 $ une fois) et **App Store** (99 $/an) pour sortir du mode test.
- Plus de builds mobiles → EAS payant, ou build local gratuit.

## 7. Recommandations pour la phase pilote

1. **Cibler Android d'abord** (0 coût de distribution) → valider avant d'investir sur iOS.
2. **1 à 3 chantiers pilotes** avec des chefs de chantier motivés.
3. Mettre en place **Sentry + PostHog** dès le début pour mesurer bugs et usage réel.
4. Prévoir un **canal de feedback** simple (groupe WhatsApp / formulaire).
5. Garder les données de test **isolées** de la future prod.

Voir la roadmap et le phasage dans [`05-roadmap.md`](05-roadmap.md).
