# 02 — Périmètre fonctionnel du MVP

> Objectif du MVP : prouver la valeur sur **1 à 3 chantiers pilotes** en couvrant le cœur
> du besoin : **gérer un projet, suivre ses dépenses et son planning, gérer les ouvriers
> et leur pointage**. Tout le reste est repoussé (voir « Hors périmètre »).

## 1. Rôles & permissions (RBAC)

| Rôle | Description | Accès principal |
|---|---|---|
| **Admin / Direction** | Gère l'entreprise, les utilisateurs, voit tout | Web + Mobile |
| **Conducteur de travaux** | Crée/gère les chantiers, budgets, valide les pointages | Web + Mobile |
| **Chef de chantier** | Pointe les ouvriers, saisit dépenses terrain, suit l'avancement | Mobile |
| **Ouvrier** | (Optionnel MVP) consulte son planning, s'auto-pointe | Mobile |

> MVP : on peut démarrer avec **Admin, Conducteur, Chef de chantier**. L'auto-pointage
> ouvrier est une option activable.

## 2. Modules du MVP

### 2.1 Module « Gestion de projet / chantier »

**Création d'un chantier**
- Nom, code, client / maître d'ouvrage, adresse, localisation GPS.
- Dates prévues (début / fin), statut (à venir / en cours / terminé / suspendu).
- Budget prévisionnel global + par poste (terrassement, enrobé, signalisation…).
- (Routier) longueur/linéaire du tronçon, type de travaux.

**Gestion des dépenses**
- Saisie d'une dépense : type (main d'œuvre, matériaux, engins, sous-traitance, divers),
  montant, date, fournisseur, chantier, catégorie/poste.
- Pièce jointe : **photo de la facture / bon** (prise depuis le mobile).
- Vue **budget vs réel** par chantier et par poste (barre de consommation, alerte dépassement).
- La **main d'œuvre est calculée automatiquement** depuis le pointage (heures × taux horaire).

**Planning**
- Vue liste + vue calendrier des tâches/phases du chantier.
- Affectation d'ouvriers et d'engins à une tâche/journée.
- Jalons (dates clés). Suivi d'avancement simple (% ou statut par tâche).

### 2.2 Module « Gestion des ouvriers »

- Fiche ouvrier : nom, téléphone, poste/qualification, **taux horaire (coût)**, statut actif.
- Affectation d'un ouvrier à un ou plusieurs chantiers.
- Liste des ouvriers présents/attendus par chantier et par jour.

### 2.3 Module « Pointage » (cœur différenciant)

- **Pointage journalier** par le chef de chantier : présents / absents, heures travaillées
  (heure d'arrivée / départ ou nb d'heures), chantier concerné.
- **Mode hors-ligne** : saisie sans réseau, synchronisation dès retour du réseau.
- **Géolocalisation** au moment du pointage (preuve de présence sur le chantier).
- (Option) **auto-pointage ouvrier** : l'ouvrier pointe son arrivée/départ depuis son mobile.
- Le pointage **alimente automatiquement** : le coût main d'œuvre du chantier + un futur export paie.
- Validation du pointage par le conducteur (verrouillage période).

### 2.4 Tableau de bord

- Par chantier : budget vs dépensé, % avancement, nb d'ouvriers, heures cumulées.
- Global (direction) : liste des chantiers, chantiers en dépassement, alertes.

## 3. User stories principales

```
En tant que conducteur de travaux,
je veux créer un chantier avec son budget par poste,
afin de suivre la marge dès le premier jour.

En tant que chef de chantier,
je veux pointer mes ouvriers le matin même sans réseau,
afin de ne pas perdre les heures et éviter les litiges.

En tant que chef de chantier,
je veux photographier une facture de matériaux et l'affecter au chantier,
afin que la dépense soit tracée immédiatement.

En tant que direction,
je veux voir en un coup d'œil les chantiers en dépassement de budget,
afin de réagir avant qu'il ne soit trop tard.

En tant qu'ouvrier (option),
je veux consulter mon planning de la semaine,
afin de savoir sur quel chantier je travaille.
```

## 4. Règles de gestion clés

- **Coût main d'œuvre** d'un chantier = Σ (heures pointées × taux horaire de l'ouvrier).
- Une dépense appartient **toujours** à un chantier et à un poste.
- Un pointage est lié à **un ouvrier, un chantier, une date** (unicité par jour).
- Un pointage validé/verrouillé ne peut plus être modifié que par un conducteur/admin.
- Alerte de dépassement quand réel > X % du budget d'un poste (seuil paramétrable).

## 5. Hors périmètre du MVP (versions ultérieures)

- Facturation client / situations de travaux / devis.
- Paie complète et export vers logiciels de paie (juste un export CSV au début).
- Gestion de stock / magasin, achats et bons de commande.
- Gestion fine des engins (maintenance, carburant, GPS engins).
- Métrés / BIM / plans, gestion documentaire avancée.
- Module qualité / sécurité (QHSE), rapports réglementaires.
- Multi-langue avancé (démarrer FR, prévoir l'i18n techniquement).
- Signature électronique, intégrations comptables.

## 6. Critères de succès du MVP (à valider sur les pilotes)

- ✅ Un chef de chantier pointe une équipe en **< 2 min/jour**.
- ✅ Le pointage fonctionne **sans réseau** et se synchronise sans perte.
- ✅ Le coût main d'œuvre du chantier est juste et **à jour en temps réel**.
- ✅ La direction voit un dépassement de budget **le jour même**.
- ✅ Adoption : les pilotes abandonnent le papier/Excel sur le périmètre couvert.

Voir l'architecture technique dans [`03-architecture.md`](03-architecture.md).
