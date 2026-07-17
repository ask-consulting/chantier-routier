# 05 — Roadmap & phasage

> Estimation indicative pour **1 développeur full-stack** (ajuster selon l'équipe).
> Les durées sont des ordres de grandeur, pas des engagements.

## 1. Phasage global

```
Sprint 0        Sprint 1-2       Sprint 3-4        Sprint 5-6        Pilote
Fondations  →   Chantiers &   →  Ouvriers &     →  Tableau de     →  Test terrain
& socle         dépenses         pointage          bord & polish     & itérations
```

## 2. Détail des lots

### 🧱 Sprint 0 — Fondations (1 à 2 semaines)
- Monorepo (web + mobile + shared), TypeScript, lint/format.
- Projet Supabase, schéma BDD initial, RLS de base.
- Auth (login, rôles), squelette de navigation web & mobile.
- CI/CD minimal + premier déploiement gratuit (web sur Vercel, APK de test).
- **Livrable :** on se connecte, on voit un écran vide par rôle, déployé.

### 🏗️ Sprint 1-2 — Gestion de projet & dépenses (2 à 3 semaines)
- CRUD chantiers + postes de budget.
- Saisie des dépenses + **photo de facture** (upload Storage).
- Vue **budget vs réel** par chantier et par poste.
- **Livrable :** un conducteur crée un chantier et suit ses dépenses.

### 👷 Sprint 3-4 — Ouvriers & pointage (2 à 3 semaines) ⭐ cœur
- Fiches ouvriers + taux horaire + affectation aux chantiers.
- **Pointage mobile** (présence, heures, géolocalisation).
- **Mode hors-ligne + synchronisation** (le plus technique).
- Calcul auto du **coût main d'œuvre** injecté dans les dépenses.
- **Livrable :** un chef de chantier pointe son équipe hors-ligne, le coût remonte.

### 📊 Sprint 5-6 — Planning, tableau de bord & polish (2 à 3 semaines)
- Planning (calendrier des tâches, affectations, avancement).
- Tableau de bord direction (KPIs, alertes dépassement).
- Export CSV pointage (préparation paie).
- Corrections UX, performance, robustesse offline.
- **Livrable :** MVP complet prêt pour le pilote.

### 🚀 Phase pilote — Test terrain (3 à 6 semaines)
- Déploiement sur 1-3 chantiers, formation express des utilisateurs.
- Collecte feedback (Sentry, PostHog, retours terrain).
- Itérations rapides (OTA updates mobile).
- **Décision :** go / no-go pour l'industrialisation.

## 3. Jalons (milestones)

| Jalon | Critère de sortie |
|---|---|
| **M1 — Socle déployé** | Auth + rôles + déploiement gratuit fonctionnels |
| **M2 — Suivi des coûts** | Chantier + dépenses + budget vs réel utilisables |
| **M3 — Pointage offline** | Pointage terrain hors-ligne synchronisé sans perte |
| **M4 — MVP complet** | Dashboard + planning + export, prêt pilote |
| **M5 — Validé terrain** | Critères de succès du `02-mvp-perimetre.md` atteints |

## 4. Priorisation (MoSCoW)

**Must have**
- Chantiers, dépenses avec photo, budget vs réel.
- Ouvriers + pointage hors-ligne + coût main d'œuvre.
- Auth + rôles + multi-tenant.

**Should have**
- Planning / calendrier, tableau de bord direction, export CSV.

**Could have**
- Auto-pointage ouvrier, alertes push, géofencing avancé.

**Won't have (cette version)**
- Facturation, paie complète, stock, engins détaillés, QHSE, BIM.
  (voir « Hors périmètre » dans `02-mvp-perimetre.md`)

## 5. Principaux risques & mitigation

| Risque | Impact | Mitigation |
|---|---|---|
| Complexité de la **sync hors-ligne** | Élevé | Prototyper tôt (Sprint 3), lib éprouvée (WatermelonDB), pointage idempotent |
| **Adoption terrain** faible | Élevé | UX ultra simple, onboarding en 5 min, impliquer les pilotes tôt |
| Dérive du périmètre | Moyen | S'en tenir au MoSCoW, tout « nice to have » → backlog |
| Dépassement des free tiers en pilote | Faible | Surveiller Supabase, 2 projets (test/prod), migrer si besoin |
| Spécificités iOS coûteuses | Faible | Android d'abord, iOS après validation |

## 6. Prochaines étapes immédiates

1. Valider ce cadrage (ces fichiers `docs/`).
2. Réaliser des **wireframes** des 5 écrans clés : liste chantiers, détail chantier
   (budget vs réel), saisie dépense, écran de pointage, tableau de bord.
3. Choisir définitivement la stack (Option A Supabase recommandée — `03-architecture.md`).
4. Lancer le **Sprint 0** (fondations + déploiement gratuit).

## 7. Après le MVP (vision produit)

- Facturation & situations de travaux, export comptable.
- Gestion des engins (carburant, maintenance, localisation).
- Module paie complet, gestion des congés/absences.
- Métrés routiers, avancement au linéaire, import de plans.
- Application ouvrier enrichie (planning, documents, messagerie).
- Multi-langue (arabe, anglais), multi-devise avancée.
- Offre commerciale : freemium + abonnement par utilisateur.
