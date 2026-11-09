# 05 — Roadmap et découpage en lots

*Réécrit le 8 novembre 2026. Le périmètre est dans [`02-mvp-perimetre.md`](02-mvp-perimetre.md).*

> **La vitrine `chantia.tn` se fait en premier (§2, LV).** Tous les lots suivants font partie du
> MVP. Leur ordre vient des dépendances entre modules, puis de la valeur : les retards arrivent
> dès le lot 1, les contrôles au lot 4.

**Pas de durées ici.** Les estimations de la version précédente ne reposaient sur aucune
mesure. Le lot 1 donnera une première vitesse réelle ; les durées des lots suivants en
découleront. La taille indiquée (S, M, L, XL) compare les lots entre eux.

## 1. Vue d'ensemble

```
LV Vitrine chantia.tn
 └─ L0 Socle
 └─ L1 Tâches et planning (retards)
     └─ L2 Équipes, pointage, paie
         └─ L3 Application mobile ───── premier test sur un vrai chantier
             ├─ L4 Contrôle qualité
             ├─ L5 Dépenses, matières, achats
             │   └─ L6 Coût total, prévisions, alertes
             │       └─ L8 Argent client
             ├─ L7 Engins complets, sous-traitants
             └─ L9 Rapports, saisie vocale
```

| Lot | Contenu | Taille | Dépend de |
|---|---|---|---|
| **LV** | Vitrine `chantia.tn` | M | — |
| **L0** | Socle : montants, fichiers, observabilité | M | — |
| **L1** | Tâches, planning, Gantt, retards | L | L0 |
| **L2** | Équipes, affectations, pointage, paie | L | L1 |
| **L3** | Application mobile et hors-ligne | XL | L2 |
| **L4** | Contrôle qualité | L | L1, L3 |
| **L5** | Dépenses, matières, achats, stock | XL | L1, L3 |
| **L6** | Coût total, prévisions, alertes | M | L2, L5 |
| **L7** | Engins complets, sous-traitants | M | L1 |
| **L8** | Devis, situations, trésorerie, facture électronique | L | L6 |
| **L9** | Rapports WhatsApp, saisie vocale en tounsi | M | L3 |

## 2. Les lots

Chaque lot se livre en plusieurs PRs courtes vers `develop`.

### LV — Vitrine `chantia.tn` (M)

- Page interactive en tounsi (lettres arabes et latines) et en français.
- Démo du chantier : Gantt, coûts, alertes, mode de paie, contrôle.
- Inscription ou demande d'accès (`02`, question 1), liens vers les applications.
- Nom de domaine, déploiement, référencement, mentions légales.
- Tant que le produit n'est pas livré, la page dit clairement qu'il est en construction.

**Sortie :** `chantia.tn` est en ligne, et une demande envoyée depuis la page arrive réellement.

### L0 — Socle (M)

Ce qui doit être juste avant que le reste s'appuie dessus.

- Stocker tous les montants en entiers, dans la plus petite unité de la devise : `worksites.total_budget`,
  `workers.hourly_rate`, `expenses.amount`.
- Stockage des fichiers (photos, plans) isolé par organisation.
- Suivi des erreurs en production (`14-etat-des-lieux.md`, §3.1).
- Journaux structurés (§3.2) et tâche planifiée pour `deleteExpired()` (§3.5).
- Préproduction, restauration de sauvegarde testée (§3.3 et §3.4).
- Écrans de comptes et de profil (§5.3).

**Sortie :** un fichier envoyé par une entreprise est inaccessible aux autres ; une erreur en
production est visible sans qu'un utilisateur la signale.

### L1 — Tâches et planning (L)

- Hiérarchie Phase / Tâche / Sous-tâche, type de chantier.
- Démarrage d'un chantier depuis la [bibliothèque de plans](16-bibliotheque-plans.md).
- Dates prévues et réelles, avancement, dépendances, jalons.
- Planning initial conservé, replanification qui garde l'ancienne référence.
- Attribution à des personnes, budget par tâche.
- Gantt web prévu contre réel, liste, calendrier.
- Détection des retards et propagation aux tâches dépendantes.

**Sortie :** un conducteur planifie un chantier ; une tâche qui glisse apparaît en retard, avec
son effet sur la date de fin.

### L2 — Équipes, affectations, pointage, paie (L)

- Tarifs par défaut sur la fiche ouvrier.
- Affectation ouvrier et tâche, avec mode de paie et tarifs figés.
- Affectation d'un engin à une tâche.
- `timesheets` rattaché à la tâche, unicité par ouvrier, tâche et date.
- Pointage web, validation et verrouillage.
- Calcul de ce qui est dû, avances, coefficient de charges, exports.

**Sortie :** le même ouvrier, payé à la tâche ici et au jour là, reçoit le bon montant, et une
hausse de son tarif ne change pas le passé.

**Bloqué par :** question 3 de `02`, et question 4 pour tout calcul légal.

### L3 — Application mobile et hors-ligne (XL)

Le lot le plus risqué : à prototyper dès son ouverture, sur le pointage seul.

- `apps/mobile` en Expo, jeton de session dans le stockage sécurisé.
- « Ma journée », pointage, position GPS, auto-pointage activable.
- Base locale et file de synchronisation idempotente.
- Prise de photo rattachée à une tâche, envoi différé.
- Publication sur App Store et Google Play.

**Sortie :** un chef de chantier pointe son équipe sans réseau, et tout remonte sans perte ni
doublon. Les boutons de la vitrine reçoivent leurs vrais liens.

**Jalon proposé :** dès la fin de ce lot, une entreprise peut essayer Chantia sur un vrai
chantier, sans attendre les lots suivants, pour corriger le reste du MVP avec de vrais retours.

### L4 — Contrôle qualité (L)

- Modèles de listes de contrôle, points de contrôle par tâche.
- Plans versionnés.
- Photos avant et après, liées au plan, à la tâche et au résultat.
- Clôture de tâche bloquée sans validation, exception admin motivée et tracée.
- Saisie sur mobile, hors ligne comprise.

**Sortie :** une tâche sous contrôle obligatoire ne se clôt pas sans validation ; chaque photo
est retrouvable depuis sa tâche, son plan et son résultat.

### L5 — Dépenses, matières, achats, stock (XL)

Découpé en deux parties livrables séparément.

**L5a — Dépenses et matières**
- Module dépenses, justificatif en photo.
- Catalogue de matières et unités, fournisseurs.
- Quantités prévues par tâche, consommation réelle.

**L5b — Achats et stock**
- Bons de commande, bon de livraison en photo.
- Rapprochement commandé, livré, facturé.
- Stock par chantier, transferts, comparaison des prix fournisseurs.

**Sortie :** une tâche qui consomme plus que prévu est signalée ; un écart de livraison est
visible dès la réception du camion.

### L6 — Coût total, prévisions, alertes (M)

- Coût réel par tâche et par chantier, toutes sources réunies.
- Budget contre réel, prévision de date et de coût de fin, marge attendue.
- Centre d'alertes, seuils paramétrables, notifications.
- Tableau de bord chantier et direction.

**Sortie :** le coût d'un chantier réel correspond à ce que l'entreprise a payé, à l'écart près
de ce qui n'a pas été saisi.

### L7 — Engins complets et sous-traitants (M)

- Gasoil par engin, entretien, échéances et alertes.
- Sous-traitants : travaux confiés, avancement, montants dus et payés.

Peut démarrer dès la fin de L1. Ces coûts rejoignent L6 quand il existe.

**Sortie :** le gasoil d'un engin entre dans son coût réel ; une assurance qui expire déclenche
une alerte.

### L8 — Argent client (L)

- Devis transformé en budget.
- Situations de travaux, encaissements, trésorerie par chantier.
- Facture électronique.

**Sortie :** la direction voit, par chantier, ce qui est facturé, encaissé et en attente.

**Bloqué par :** question 5 de `02`.

### L9 — Rapports et saisie vocale (M)

- Rapport journalier généré, partagé sur WhatsApp.
- Prototype de saisie vocale en tounsi, puis intégration s'il est assez fiable.

**Sortie :** un rapport part en moins d'une minute ; la saisie vocale est gardée ou écartée sur
la base de vrais enregistrements.

**Bloqué par :** questions 6 et 7 de `02`.

## 3. Règles de livraison

- Chaque PR remonte le cliquet de couverture des paquets touchés, jusqu'à 80 %.
- Une fonctionnalité n'est « faite » que fusionnée sur `develop` et vérifiée en production
  (`14-etat-des-lieux.md`, priorité 0).
- Une migration de données se relit à part du code qui l'utilise.
- Nouveaux modules API : suivre `06-api-conventions-ddd-cqrs.md`.

## 4. Risques

| Risque | Impact | Parade |
|---|---|---|
| Périmètre du MVP très large, sans utilisateur à ce jour | Élevé | Test réel dès L3, avant les lots suivants |
| Synchronisation hors ligne | Élevé | Prototype au début de L3, écritures idempotentes |
| Adoption sur le terrain | Élevé | « Ma journée » très simple, essai avec de vrais chefs de chantier |
| Règles légales de paie et de facturation mal comprises | Élevé | Expert-comptable tunisien avant L2 et L8 |
| Fiabilité de la saisie vocale en tounsi | Moyen | Prototype avant engagement |
| Coût du stockage des photos | Moyen | Compression à l'envoi, suivi de la consommation dès L0 |
| Limites des offres gratuites d'hébergement | Moyen | Surveillance, budget d'hébergement à prévoir avant le premier client |

## 5. Après le MVP

- Analyse approfondie des photos par l'IA.
- Détection des défauts d'exécution à partir des plans.
- BIM et métrés sur plans, suivi GPS des engins, signature électronique.
- Intégrations comptables directes.
- Offre commerciale à définir.
