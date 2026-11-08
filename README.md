# Chantia — Gestion de chantiers

> Application (web + mobile) de suivi complet des chantiers, pour les entreprises tunisiennes.
> MVP : planning par tâches, équipes, pointage et paie, matières, engins, contrôle qualité, coût total par chantier.

Ce dépôt contient la **documentation de cadrage** du projet. Ces fichiers servent de
référence (contexte) pour toutes les décisions et développements ultérieurs.

## 📁 Index de la documentation

| Fichier | Contenu |
|---|---|
| [`docs/01-analyse-marche.md`](docs/01-analyse-marche.md) | Analyse des solutions existantes, forces/faiblesses, positionnement |
| [`docs/02-mvp-perimetre.md`](docs/02-mvp-perimetre.md) | Périmètre fonctionnel du MVP, user stories, ce qui est hors périmètre |
| [`docs/03-architecture.md`](docs/03-architecture.md) | Architecture technique (web, mobile, back-end), modèle de données |
| [`docs/04-deploiement-gratuit.md`](docs/04-deploiement-gratuit.md) | Plan de déploiement 100% gratuit pour la phase de test |
| [`docs/05-roadmap.md`](docs/05-roadmap.md) | Roadmap et découpage en lots |
| [`docs/06-api-conventions-ddd-cqrs.md`](docs/06-api-conventions-ddd-cqrs.md) | Conventions de l'API back-end (DDD / CQRS, code en anglais) |

## 🎯 Résumé en une phrase

Un outil pensé pour la **direction**, les **conducteurs de travaux** et les **chefs de
chantier** afin de voir les **retards** et les **contrôles mal faits** avant qu'ils ne coûtent,
et de connaître le **coût réel de chaque chantier**, tâche par tâche, là où Excel et
WhatsApp montrent leurs limites.

## 👤 Cible

- Entreprises de construction de tous types de chantiers : bâtiment, routes, réseaux, terrassement.
- Marché : la Tunisie.
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
└── shared/   # @chantia/shared — types, enums, calculs métier purs (réutilisés API + web + mobile)
```

Démarrer l'API en local : `pnpm api` (voir `docs/06-api-conventions-ddd-cqrs.md`).
