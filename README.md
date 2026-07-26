# Chantier Routier — Gestion de chantiers routiers

> Application (web + mobile) de gestion de chantiers routiers.
> MVP : gestion de projet (création, dépenses, planning), gestion des ouvriers et pointage.

Ce dépôt contient la **documentation de cadrage** du projet. Ces fichiers servent de
référence (contexte) pour toutes les décisions et développements ultérieurs.

## 📁 Index de la documentation

| Fichier | Contenu |
|---|---|
| [`docs/01-analyse-marche.md`](docs/01-analyse-marche.md) | Analyse des solutions existantes, forces/faiblesses, positionnement |
| [`docs/02-mvp-perimetre.md`](docs/02-mvp-perimetre.md) | Périmètre fonctionnel du MVP, user stories, ce qui est hors périmètre |
| [`docs/03-architecture.md`](docs/03-architecture.md) | Architecture technique (web, mobile, back-end), modèle de données |
| [`docs/04-deploiement-gratuit.md`](docs/04-deploiement-gratuit.md) | Plan de déploiement 100% gratuit pour la phase de test |
| [`docs/05-roadmap.md`](docs/05-roadmap.md) | Roadmap, phasage, estimation d'effort |
| [`docs/06-api-conventions-ddd-cqrs.md`](docs/06-api-conventions-ddd-cqrs.md) | Conventions de l'API back-end (DDD / CQRS, code en anglais) |

## 🎯 Résumé en une phrase

Un outil simple, mobile-first et hors-ligne, pensé pour les **conducteurs de travaux**
et **chefs de chantier** afin de suivre en temps réel les **coûts**, l'**avancement** et
la **présence des ouvriers** sur les chantiers routiers — là où les outils génériques
(Excel, WhatsApp) montrent leurs limites.

## 👤 Cible

- Petites et moyennes entreprises de travaux publics / routiers (5 à 200 salariés).
- Marché initial : francophone (France, Maghreb).
- Utilisateurs : direction, conducteur de travaux, chef de chantier, ouvrier.

## 🚦 État

- [x] Cadrage & analyse
- [ ] Maquettes (wireframes)
- [~] Développement MVP — API back-end initialisée (`apps/api`, NestJS + DDD/CQRS + Prisma)
- [ ] Phase de test terrain

## 🏗️ Structure du monorepo

```
apps/
├── api/      # API back-end NestJS (Fastify + Prisma), architecture DDD/CQRS
├── web/      # Next.js (direction & conducteur)
└── mobile/   # Expo (terrain, hors-ligne)
packages/
└── shared/   # @chantier/shared — types, enums, calculs métier purs (réutilisés API + web + mobile)
```

Démarrer l'API en local : `pnpm api` (voir `docs/06-api-conventions-ddd-cqrs.md`).
