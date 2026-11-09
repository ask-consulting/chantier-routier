# 02 — Périmètre fonctionnel du MVP

*Réécrit le 8 novembre 2026. Remplace le périmètre d'origine, centré sur la route et limité
aux chantiers, dépenses et pointage.*

> **Chantia suit un chantier de bout en bout, pour les entreprises tunisiennes, quel que soit
> le type de chantier** : bâtiment, routes, réseaux, terrassement.
>
> Le MVP doit permettre de **voir les retards et les contrôles mal faits avant qu'ils ne
> coûtent**, et de connaître le **coût réel de chaque chantier, tâche par tâche**.

Le découpage en lots et l'ordre de construction sont dans [`05-roadmap.md`](05-roadmap.md).

## 1. Principes

Ces cinq règles traversent tous les modules. Les changer après coup coûte cher.

1. **La tâche relie tout.** Une heure pointée, une tonne consommée, un jour d'engin, une
   photo et un contrôle sont rattachés à une tâche d'un chantier. Le planning et le coût sont
   une seule et même donnée.
2. **Le prévu et le réel sont deux choses distinctes.** Le planning et le budget initiaux
   sont conservés quand le réel s'en écarte. Sans cela, un retard ne se mesure pas.
3. **Le passé ne bouge pas.** Un taux, un prix ou un mode de paie sont figés au moment du
   travail. Modifier la fiche d'un ouvrier ne réécrit pas le coût d'un chantier terminé. La
   règle existe déjà pour les affectations d'engins.
4. **Une photo a toujours un contexte.** Chaque photo est liée à un chantier, une tâche et,
   quand il existe, un plan et un résultat de contrôle. L'IA prévue après le MVP (§8) a
   besoin de cet historique, et il ne se reconstitue pas après coup.
5. **Un montant est un nombre entier de la plus petite unité de la devise** : des millimes pour
   le dinar, des centimes pour l'euro (`BIGINT`). La devise de l'organisation lui donne son
   sens, elle ne change donc plus dès qu'il y a des données ([`10`](10-conventions-base-de-donnees.md), §5 bis).

## 2. Rôles

| Rôle | Dans l'API | Accès principal |
|---|---|---|
| **Admin / Direction** | `admin` | Web et mobile |
| **Conducteur de travaux** | `site_manager` | Web et mobile |
| **Chef de chantier** | `foreman` | Mobile |
| **Ouvrier** | `worker` | Mobile |

Les droits suivent la matrice statique de `packages/shared`. Chaque nouveau module y ajoute
ses permissions.

## 3. Les modules

L'état est celui du dépôt au 8 novembre 2026.

| # | Module | État |
|---|---|---|
| 3.1 | Comptes, organisations, invitations | Fait côté API ; écrans de comptes et profil à faire |
| 3.2 | Clients et chantiers | Fait |
| 3.3 | Planning et tâches | À faire |
| 3.4 | Équipes, affectations, pointage | Fiches ouvriers faites ; le reste à faire |
| 3.5 | Paie et charge salariale | À faire |
| 3.6 | Application mobile | À faire |
| 3.7 | Contrôle qualité | À faire |
| 3.8 | Dépenses, matières, achats, stock | Table des dépenses seule, sans code |
| 3.9 | Parc matériel | Catalogue, engins, coût par jour et affectations faits |
| 3.10 | Sous-traitants | À faire |
| 3.11 | Coût total, prévisions, alertes | Coût des engins seulement |
| 3.12 | Argent client | À faire |
| 3.13 | Rapports et saisie vocale | À faire |

### 3.1 Comptes

- Organisations isolées, rôles, invitations par lien et par email, connexion : en place.
- À faire : liste des comptes, changement de rôle, désactivation, profil.

### 3.2 Clients et chantiers

- Clients personnes physiques ou morales, contacts, adresse de facturation.
- Chantiers : code, client, adresse, position GPS, dates prévues, statut.
- À faire : type de chantier (bâtiment, routes, réseaux, terrassement, autre).

### 3.3 Planning et tâches

- Hiérarchie sur trois niveaux à l'intérieur d'un chantier (§7, question 2 sur les noms).
- Dates prévues et réelles, avancement, dépendances entre tâches, jalons.
- Attribution d'une tâche à une ou plusieurs personnes.
- Budget par tâche.
- Diagramme de Gantt prévu contre réel, liste, vue calendrier.
- Sur téléphone, une vue simple « ma journée ».
- Détection des retards : tâche non commencée à sa date, tâche qui dépasse sa fin prévue,
  impact sur les tâches qui en dépendent.

### 3.4 Équipes, affectations, pointage

- Fiche ouvrier : nom, téléphone, qualification, tarifs par défaut (heure, jour).
- Affectation d'un ouvrier **à une tâche**, avec son mode de paie pour cette tâche.
- Affectation d'un engin à une tâche, en prolongeant l'affectation au chantier existante.
- Pointage quotidien par le chef de chantier : présence, heures, tâche.
- Un ouvrier peut travailler sur plusieurs tâches le même jour.
- Hors ligne : saisie sans réseau, synchronisation au retour du réseau, sans doublon.
- Position GPS au moment du pointage, comme preuve de présence.
- Auto-pointage de l'ouvrier, activable par entreprise.
- Validation et verrouillage par le conducteur.

### 3.5 Paie et charge salariale

- **Le mode de paie se règle par ouvrier et par tâche** : le même ouvrier peut être payé à la
  tâche sur l'une, à l'heure ou au jour sur une autre.
- Calcul de ce qui est dû à chaque ouvrier sur une période.
- Avances sur salaire, déduites du montant dû.
- Coût employeur : le salaire plus un coefficient de charges paramétrable.
- Exports vers le comptable.

Le calcul légal (CNSS, impôt, conventions) n'est pas encore spécifié : voir §7, question 4.

### 3.6 Application mobile

Une application Expo, décidée le 27 septembre 2026 (voir `14-etat-des-lieux.md`, priorité 4),
pour iOS et Android.

- Connexion, « ma journée », pointage, photos, contrôles, bons de livraison.
- Fonctionne hors ligne pour tout ce qui se saisit sur le terrain.

### 3.7 Contrôle qualité

- Modèles de listes de contrôle, réutilisables d'un chantier à l'autre.
- Points de contrôle attachés aux tâches.
- Plans du chantier, versionnés.
- Pour chaque point : plan de référence, photos avant et après, résultat, auteur, date.
- **Une tâche ne se termine pas tant que ses contrôles obligatoires ne sont pas validés.** Un
  admin peut passer outre, en donnant un motif qui reste tracé.
- Contrôles en retard ou refusés visibles dans les alertes (§3.11).

### 3.8 Dépenses, matières, achats, stock

- Catalogue de matières (zeft, 7jar, trab, sable, ciment, fer, briques…) avec unités, extensible
  par chaque entreprise.
- Fournisseurs et comparaison de leurs prix.
- Bons de commande.
- **Bon de livraison pris en photo** par le chef de chantier, rapproché de la commande et de la
  facture : commandé, livré, facturé.
- Stock par chantier, transferts entre chantiers.
- **Consommation prévue contre réelle** par tâche, pour faire ressortir pertes et vols.
- Dépenses diverses avec justificatif en photo.

### 3.9 Parc matériel

- En place : catalogue de 74 types en 11 catégories, engins, mode d'acquisition, coût par jour,
  affectations sans double réservation, prix figé, jours passés verrouillés.
- À faire : gasoil par engin, entretien, échéances (assurance, visite technique).

### 3.10 Sous-traitants

- Fiche, travaux confiés par tâche, avancement constaté, montants dus et payés.

### 3.11 Coût total, prévisions, alertes

- Coût réel par tâche et par chantier : main-d'œuvre, matières, engins, sous-traitance, divers.
- Budget contre réel, alerte le jour même d'un dépassement.
- **Prévision de fin** : au rythme actuel, date et coût finaux, marge attendue.
- Alertes : retard, dépassement, surconsommation, contrôle manquant ou refusé.
- Tableau de bord par chantier et pour la direction.

### 3.12 Argent client

- Devis, qui devient le budget du chantier sans ressaisie.
- Situations de travaux.
- Encaissements et trésorerie par chantier : qui doit quoi.
- Facture électronique (El Fatoora, Tunisie TradeNet).

### 3.13 Rapports et saisie vocale

- Rapport journalier (avancement, photos, incidents) envoyé au client sur WhatsApp.
- Note vocale en tounsi transformée en saisie.

## 4. User stories

```
En tant que direction,
je veux voir qu'un chantier va finir en retard et à quel coût,
afin de réagir tant qu'il est encore temps.

En tant que conducteur de travaux,
je veux qu'une tâche ne soit pas close sans son contrôle validé,
afin qu'un défaut ne soit pas recouvert par la tâche suivante.

En tant que conducteur de travaux,
je veux payer le même ouvrier à la tâche ici et au jour là,
afin de refléter ce qui a été convenu avec lui.

En tant que chef de chantier,
je veux pointer mon équipe sans réseau,
afin de ne perdre aucune heure et d'éviter les litiges.

En tant que chef de chantier,
je veux photographier le bon de livraison du camion,
afin que ce qui est arrivé soit comparé à ce qui a été commandé.

En tant que direction,
je veux voir qu'une tâche a consommé plus de ciment que prévu,
afin de repérer une perte avant la fin du chantier.

En tant qu'ouvrier,
je veux voir où je travaille cette semaine et ce qui m'est dû,
afin de ne pas avoir à le demander.
```

## 5. Règles de gestion

- **Coût main-d'œuvre d'une tâche** = somme, par ouvrier, de ce que produit son mode de paie
  sur cette tâche :
  - à l'heure : heures pointées × tarif horaire figé ;
  - au jour : jours pointés × tarif journalier figé ;
  - à la tâche : le forfait convenu (§7, question 3 sur le moment où il compte).
- **Unicité du pointage** : un ouvrier, une tâche, une date.
- Une dépense appartient toujours à un chantier ; elle est rattachée à une tâche, sauf frais
  généraux du chantier.
- Un pointage verrouillé ne se modifie que par un conducteur ou un admin.
- Un engin n'est jamais sur deux chantiers le même jour (règle en place).
- Le planning initial est figé au démarrage du chantier. Le replanifier crée une nouvelle
  référence et garde l'ancienne.
- Seuils d'alerte paramétrables par entreprise.

## 6. Critères de réussite

Chacun se mesure sur un vrai chantier.

- Un retard est visible **le jour où il apparaît**, avec son effet sur la date de fin.
- Aucune tâche sous contrôle obligatoire ne se clôt sans validation ou exception tracée.
- Un chef de chantier pointe son équipe en **moins de 2 minutes par jour**.
- Le pointage fonctionne **sans réseau** et se synchronise sans perte ni doublon.
- Le coût d'un chantier, tâche par tâche, correspond à ce que l'entreprise a réellement payé.
- Un écart entre commandé, livré et facturé est signalé dès la livraison.
- L'entreprise abandonne le papier et Excel sur ce que Chantia couvre.

## 7. Questions ouvertes

| # | Question | Recommandation |
|---|---|---|
| 1 | Inscription libre, ou demande d'accès avec invitation ? | Demande d'accès au début |
| 2 | Noms des trois niveaux | **Décidé le 9 novembre 2026 : Phase / Tâche / Sous-tâche** |
| 3 | Un forfait à la tâche compte-t-il au prorata de l'avancement, ou à la validation de la tâche ? | Prorata pour le coût affiché, validation pour ce qui est dû à l'ouvrier |
| 4 | Règles légales de paie : CNSS, retenues, convention applicable | À établir avec un expert-comptable tunisien avant de construire le calcul |
| 5 | Facture électronique : quelles entreprises sont concernées, et par quelle voie se raccorder ? | À valider avec le même expert ; les sources publiques consultées se contredisent |
| 6 | Rapport WhatsApp : API officielle (validation, coût par message) ou simple partage depuis le téléphone ? | Partage depuis le téléphone d'abord |
| 7 | La note vocale en tounsi est-elle assez fiable ? | Prototype sur de vrais enregistrements avant de s'y engager |

## 8. Hors MVP

- **Modules d'IA** : analyse approfondie des photos, détection des défauts d'exécution à partir
  des plans.
- BIM et métrés sur plans.
- Suivi GPS des engins.
- Signature électronique.
- Intégrations directes avec les logiciels comptables, au-delà des exports.
