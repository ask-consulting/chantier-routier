# 16 — Bibliothèque de plans de projet

*Créé le 9 novembre 2026.*

Des plans types, en **Phase / Tâche / Sous-tâche**, pour démarrer un chantier sans partir d'une
page blanche.

## 1. Le fonctionnement

| | Référence | Plan d'une entreprise |
|---|---|---|
| Tables | `plan_templates`, `plan_template_nodes` et leurs traductions | `organization_plans`, `organization_plan_nodes` |
| Visible par | Toutes les entreprises | Cette entreprise seulement |
| Modifié par | Une migration pour l'instant, l'application d'administration ensuite ; jamais par l'API des entreprises | Admin et conducteur de travaux (`plan:manage`) |
| Isolation | Pas d'`organizationId` | `organizationId` sur les deux tables, filtre de [`09-multi-tenant.md`](09-multi-tenant.md) |

Une entreprise **copie** un plan de référence, puis modifie sa copie. Une copie et non un lien :
sa version ne bouge pas si la référence évolue, et la référence reste la même pour tout le monde.

| Route | Rôle |
|---|---|
| `GET /plan-templates` | Liste des plans de référence |
| `GET /plan-templates/:id` | Un plan de référence complet |
| `GET /organization-plans` | Les plans de l'entreprise |
| `GET /organization-plans/:id` | Un plan complet |
| `POST /organization-plans` | Copier une référence, ou créer un plan vide |
| `PUT /organization-plans/:id` | Renommer, ou remplacer tout l'arbre |
| `DELETE /organization-plans/:id` | Supprimer |

Une ligne marquée **[contrôle]** est un point à valider avant de continuer. Elle servira au lot L4.

## 2. Limites du contenu

**À faire relire par des gens du métier avant de le présenter comme une référence.**

- C'est la pratique courante de la construction. Aucun référentiel officiel tunisien n'a été
  trouvé : ni cahier des prescriptions du Ministère de l'Équipement, ni règles de pose SONEDE,
  ONAS ou STEG. Les règles des concessionnaires priment sur ces modèles.
- Aucune durée ni dépendance : les sources n'en donnent pas de fiables, et les inventer fausserait
  les plannings.
- Libellés en français seulement. Un libellé sans traduction s'affiche en français ; l'arabe
  s'ajoutera par des lignes de traduction, sans changer le schéma.
- Corriger la référence demande une nouvelle migration, tant que l'application d'administration
  n'existe pas.

## 3. Sources

Elles ont servi à établir l'ordre des travaux, le texte est rédigé pour Chantia.

- Structure d'un découpage bâtiment : [Procore](https://procore.com/en-gb/library/work-breakdown-structure)
- Ordre gros œuvre et second œuvre : [Plan Immobilier](https://www.plan-immobilier.fr/guide-immobilier/construire/etapes-de-la-construction/gros-oeuvre)
- Allotissement : [marche-public.fr](https://www.marche-public.fr/Marches-publics/Definitions/Entrees/Allotissement-exemples.htm)
- Séquence d'une route : [cours de construction routière](https://nec-license.gitbook.io/books/civil/9.-transportation/9.6-road-construction-and-maintenance), [Queensland TMR](https://www.tmr.qld.gov.au/_/media/busind/techstdpubs/project-delivery-and-maintenance/project-cost-estimating-manual/annexure-c.pdf)
- Couches de chaussée dans des marchés tunisiens : [documents d'appels d'offres publiés par l'ONU en Tunisie](https://tunisia.un.org/fr/download/151343/257063)
- Pose de canalisations : [Université de Souk Ahras](https://www.univ-soukahras.dz/moodle/pluginfile.php/87435/mod_lesson/intro/Chapitre-4.-Pose-Des-Canalisations.pdf), [Synergrid](https://www.synergrid.be/images/downloads/g5-05-fr-ouverture-remblayage-tranchees-v200011.pdf)

## 4. Les modèles

| Type | Modèle | Lignes | Contrôles |
|---|---|---|---|
| Bâtiment | Maison individuelle ou villa | 106 | 11 |
| Bâtiment | Immeuble collectif | 93 | 14 |
| Bâtiment | Rénovation ou réhabilitation | 61 | 9 |
| Bâtiment | Hangar ou bâtiment industriel | 65 | 10 |
| Routes | Route neuve | 75 | 13 |
| Routes | Renforcement ou réhabilitation de chaussée | 53 | 9 |
| Routes | Piste rurale | 45 | 7 |
| Réseaux | Réseau d'eau potable | 65 | 9 |
| Réseaux | Réseau d'assainissement | 60 | 10 |
| Réseaux | Réseaux électriques et télécom enterrés | 52 | 9 |
| Terrassement et VRD | Terrassement général et plateforme | 53 | 10 |
| Terrassement et VRD | Lotissement et VRD | 63 | 10 |


### Maison individuelle ou villa

#### Préparation du chantier

- **Dossier et autorisations**
  - Vérification du dossier d'exécution
  - Autorisations administratives
  - Choix des fournisseurs et sous-traitants
- **Installation de chantier**
  - Clôture et accès
  - Base vie, eau et électricité de chantier
  - Panneau de chantier
  - Signalisation et sécurité
- **Implantation**
  - Levé du terrain
  - Implantation des ouvrages
  - Réception de l'implantation **[contrôle]**

#### Terrassement et fondations

- **Terrassement**
  - Décapage de la terre végétale
  - Fouilles en rigoles ou en puits
  - Réception du fond de fouille **[contrôle]**
- **Fondations**
  - Béton de propreté
  - Ferraillage des semelles et amorces
  - Contrôle du ferraillage avant coulage **[contrôle]**
  - Coulage des semelles
  - Longrines
- **Soubassement**
  - Maçonnerie de soubassement
  - Étanchéité des soubassements
  - Réseaux enterrés sous dallage
  - Remblai compacté
  - Dallage sur terre-plein

#### Gros œuvre

- **Rez-de-chaussée**
  - Poteaux : coffrage, ferraillage, coulage
  - Murs en briques
  - Coffrage et étaiement du plancher
  - Pose des hourdis et ferraillage du plancher
  - Réservations pour les réseaux
  - Contrôle du plancher avant coulage **[contrôle]**
  - Coulage du plancher
- **Étage**
  - Poteaux : coffrage, ferraillage, coulage
  - Murs en briques
  - Coffrage et étaiement du plancher
  - Pose des hourdis et ferraillage du plancher
  - Contrôle du plancher avant coulage **[contrôle]**
  - Coulage du plancher
- **Escalier**
  - Coffrage et ferraillage de la paillasse
  - Coulage de l'escalier
- **Toiture-terrasse et acrotères**
  - Acrotères
  - Forme de pente
  - Étanchéité multicouche
  - Essai d'étanchéité à l'eau **[contrôle]**
  - Protection de l'étanchéité

#### Corps d'état techniques

- **Plomberie et sanitaire**
  - Alimentation et évacuations encastrées
  - Essai de pression des canalisations **[contrôle]**
  - Pose des appareils sanitaires
- **Électricité**
  - Saignées, gaines et boîtiers
  - Tirage des câbles et tableau
  - Contrôle de l'installation électrique **[contrôle]**
- **Climatisation et gaz**
  - Pré-installation des liaisons
  - Installation du gaz selon les règles du distributeur

#### Enveloppe et finitions

- **Enduits**
  - Enduits intérieurs
  - Enduits extérieurs
- **Menuiseries**
  - Pose des précadres
  - Menuiseries extérieures
  - Portes intérieures
  - Ferronnerie et garde-corps
- **Revêtements**
  - Chape
  - Carrelage et plinthes
  - Faïence
  - Marbre des seuils et de l'escalier
- **Peinture**
  - Enduit de lissage
  - Peinture intérieure
  - Peinture extérieure

#### Aménagements extérieurs et raccordements

- **Clôture et portail**
  - Murs de clôture
  - Portail
- **Raccordements**
  - Branchement STEG
  - Branchement SONEDE
  - Raccordement à l'assainissement ou fosse
- **Abords**
  - Citerne ou majel
  - Dallage et plantations

#### Réception

- **Opérations préalables**
  - Nettoyage et repli du chantier
  - Visite de pré-réception **[contrôle]**
  - Dossier des ouvrages exécutés
- **Réception**
  - Réception provisoire **[contrôle]**
  - Levée des réserves
  - Réception définitive **[contrôle]**

### Immeuble collectif

#### Préparation du chantier

- **Dossier et autorisations**
  - Vérification du dossier d'exécution
  - Autorisations administratives
  - Choix des fournisseurs et sous-traitants
- **Installation de chantier**
  - Clôture et accès
  - Base vie, eau et électricité de chantier
  - Panneau de chantier
  - Signalisation et sécurité
- **Implantation**
  - Levé du terrain
  - Implantation des ouvrages
  - Réception de l'implantation **[contrôle]**

#### Infrastructure

- **Terrassement en grande masse**
  - Fouilles et évacuation des déblais
  - Blindage ou protection des mitoyens
  - Réception du fond de fouille **[contrôle]**
- **Fondations**
  - Béton de propreté
  - Radier ou semelles : ferraillage
  - Contrôle du ferraillage avant coulage **[contrôle]**
  - Coulage des fondations
- **Sous-sol**
  - Voiles et poteaux
  - Étanchéité des parois enterrées
  - Dalle haute du sous-sol

#### Superstructure

- **Structure par niveau**
  - Poteaux et voiles
  - Cage d'escalier et gaine d'ascenseur
  - Coffrage et ferraillage du plancher
  - Contrôle du plancher avant coulage **[contrôle]**
  - Coulage du plancher
  - Prélèvement d'éprouvettes de béton **[contrôle]**
  - Décoffrage et rotation des étais
- **Maçonnerie**
  - Murs de façade
  - Cloisons de distribution
- **Toiture-terrasse**
  - Acrotères et forme de pente
  - Étanchéité
  - Essai d'étanchéité à l'eau **[contrôle]**

#### Lots techniques

- **Plomberie et colonnes montantes**
  - Colonnes d'eau et d'évacuation
  - Réseaux des appartements
  - Essai de pression des canalisations **[contrôle]**
- **Électricité et courants faibles**
  - Colonnes montantes et comptages
  - Réseaux des appartements
  - Interphonie et télécom
  - Contrôle de l'installation électrique **[contrôle]**
- **Ascenseur**
  - Pose de l'ascenseur
  - Réception de l'ascenseur **[contrôle]**
- **Sécurité incendie**
  - Équipements des parties communes
  - Contrôle de la sécurité incendie **[contrôle]**
- **Climatisation et ventilation**
  - Réseaux et attentes

#### Finitions

- **Façades**
  - Enduits et revêtement de façade
  - Menuiseries extérieures et garde-corps
- **Appartements**
  - Enduits et chapes
  - Carrelage et faïence
  - Menuiseries intérieures
  - Appareillage et sanitaires
  - Peinture
  - Contrôle de finition par appartement **[contrôle]**
- **Parties communes**
  - Hall et escaliers
  - Peinture et éclairage

#### Abords et raccordements

- **Raccordements**
  - Branchements STEG et SONEDE
  - Raccordement ONAS
  - Raccordement télécom
- **Abords**
  - Parking et voirie intérieure
  - Espaces verts et clôture

#### Réception

- **Opérations préalables**
  - Nettoyage et repli du chantier
  - Visite de pré-réception **[contrôle]**
  - Dossier des ouvrages exécutés
- **Réception**
  - Réception provisoire **[contrôle]**
  - Levée des réserves
  - Réception définitive **[contrôle]**

### Rénovation ou réhabilitation

#### Préparation du chantier

- **Dossier et autorisations**
  - Vérification du dossier d'exécution
  - Autorisations administratives
  - Choix des fournisseurs et sous-traitants
- **Installation de chantier**
  - Clôture et accès
  - Base vie, eau et électricité de chantier
  - Panneau de chantier
  - Signalisation et sécurité
- **Implantation**
  - Levé du terrain
  - Implantation des ouvrages
  - Réception de l'implantation **[contrôle]**

#### Diagnostic

- **État des existants**
  - Relevé des existants
  - Repérage de la structure et des réseaux
  - Diagnostic structurel **[contrôle]**

#### Dépose et démolition

- **Protection**
  - Protection des parties conservées
  - Étaiement provisoire
- **Dépose**
  - Dépose des revêtements et menuiseries
  - Dépose des réseaux
  - Démolition des cloisons
  - Évacuation des gravats

#### Reprise de structure

- **Renforcement**
  - Reprise en sous-œuvre ou renfort des poteaux
  - Ouvertures et linteaux
  - Contrôle des renforts avant fermeture **[contrôle]**
- **Traitement des pathologies**
  - Traitement des fissures
  - Traitement de l'humidité
  - Réfection de l'étanchéité
  - Essai d'étanchéité à l'eau **[contrôle]**

#### Réseaux

- **Plomberie**
  - Nouveaux réseaux
  - Essai de pression des canalisations **[contrôle]**
- **Électricité**
  - Nouveaux réseaux et tableau
  - Contrôle de l'installation électrique **[contrôle]**

#### Finitions

- **Second œuvre**
  - Enduits et cloisons
  - Menuiseries
  - Carrelage et faïence
  - Sanitaires et appareillage
  - Peinture

#### Réception

- **Opérations préalables**
  - Nettoyage et repli du chantier
  - Visite de pré-réception **[contrôle]**
  - Dossier des ouvrages exécutés
- **Réception**
  - Réception provisoire **[contrôle]**
  - Levée des réserves
  - Réception définitive **[contrôle]**

### Hangar ou bâtiment industriel

#### Préparation du chantier

- **Dossier et autorisations**
  - Vérification du dossier d'exécution
  - Autorisations administratives
  - Choix des fournisseurs et sous-traitants
- **Installation de chantier**
  - Clôture et accès
  - Base vie, eau et électricité de chantier
  - Panneau de chantier
  - Signalisation et sécurité
- **Implantation**
  - Levé du terrain
  - Implantation des ouvrages
  - Réception de l'implantation **[contrôle]**

#### Terrassement et fondations

- **Plateforme**
  - Décapage et mise à niveau
  - Essai de portance de la plateforme **[contrôle]**
- **Fondations**
  - Massifs et longrines
  - Implantation des tiges d'ancrage
  - Contrôle des tiges d'ancrage avant coulage **[contrôle]**
  - Coulage des massifs

#### Charpente métallique

- **Fabrication**
  - Plans d'atelier
  - Fabrication et protection anticorrosion
  - Contrôle en atelier **[contrôle]**
- **Montage**
  - Levage des portiques
  - Pannes et contreventements
  - Contrôle du serrage et de l'aplomb **[contrôle]**

#### Enveloppe

- **Couverture et bardage**
  - Couverture
  - Bardage
  - Chéneaux et descentes

#### Dallage industriel

- **Dallage**
  - Forme compactée
  - Essai de compactage **[contrôle]**
  - Ferraillage ou fibres
  - Coulage et surfaçage
  - Sciage des joints

#### Lots techniques et portes

- **Réseaux**
  - Électricité et éclairage
  - Contrôle de l'installation électrique **[contrôle]**
  - Plomberie et évacuation
  - Sécurité incendie
- **Fermetures**
  - Portes sectionnelles et issues

#### Abords

- **Voirie et clôture**
  - Voirie et aires de manœuvre
  - Clôture et portail

#### Réception

- **Opérations préalables**
  - Nettoyage et repli du chantier
  - Visite de pré-réception **[contrôle]**
  - Dossier des ouvrages exécutés
- **Réception**
  - Réception provisoire **[contrôle]**
  - Levée des réserves
  - Réception définitive **[contrôle]**

### Route neuve

#### Préparation du chantier

- **Dossier et autorisations**
  - Vérification du dossier d'exécution
  - Autorisations et coordination avec les concessionnaires
  - Agrément des carrières et formules
- **Installation de chantier**
  - Base vie et stockage
  - Signalisation temporaire et déviations
  - Laboratoire de chantier
- **Implantation**
  - Levé topographique et profils
  - Piquetage de l'axe
  - Réception de l'implantation **[contrôle]**

#### Dégagement des emprises

- **Libération de l'emprise**
  - Débroussaillage et abattage
  - Déplacement des réseaux existants
  - Démolitions
  - Décapage de la terre végétale

#### Ouvrages hydrauliques

- **Dalots et buses**
  - Fouilles
  - Pose des buses ou coulage des dalots
  - Contrôle du ferraillage avant coulage **[contrôle]**
  - Têtes d'ouvrage et remblai contigu
- **Assainissement longitudinal**
  - Fossés
  - Caniveaux et descentes

#### Terrassements

- **Déblais et remblais**
  - Déblais
  - Mise en remblai par couches
  - Essai de compactage des remblais **[contrôle]**
- **Couche de forme**
  - Mise en œuvre de la couche de forme
  - Réglage de l'arase
  - Réception de l'arase de terrassement **[contrôle]**

#### Corps de chaussée

- **Couche de fondation**
  - Approvisionnement en grave
  - Contrôle du matériau **[contrôle]**
  - Mise en œuvre et compactage
  - Essai de densité et de portance **[contrôle]**
- **Couche de base**
  - Mise en œuvre de la grave ou de la grave-bitume
  - Essai de densité et contrôle des cotes **[contrôle]**
- **Accotements**
  - Épaulement en grave concassée
  - Revêtement des accotements

#### Revêtement

- **Couche d'accrochage**
  - Imprégnation
  - Couche d'accrochage
- **Couche de roulement**
  - Mise en œuvre du béton bitumineux ou de l'enduit bicouche
  - Contrôle de température et d'épaisseur **[contrôle]**
  - Prélèvement de carottes **[contrôle]**
  - Contrôle d'uni **[contrôle]**

#### Signalisation et équipements

- **Signalisation**
  - Signalisation verticale
  - Marquage au sol
- **Sécurité et éclairage**
  - Glissières de sécurité
  - Bornes
  - Éclairage public

#### Réception

- **Opérations préalables**
  - Nettoyage et repli du chantier
  - Visite de pré-réception **[contrôle]**
  - Plans de récolement
- **Réception**
  - Réception provisoire **[contrôle]**
  - Levée des réserves
  - Réception définitive **[contrôle]**

### Renforcement ou réhabilitation de chaussée

#### Préparation du chantier

- **Dossier et autorisations**
  - Vérification du dossier d'exécution
  - Autorisations et coordination avec les concessionnaires
  - Agrément des carrières et formules
- **Installation de chantier**
  - Base vie et stockage
  - Signalisation temporaire et déviations
  - Laboratoire de chantier
- **Implantation**
  - Levé topographique et profils
  - Piquetage de l'axe
  - Réception de l'implantation **[contrôle]**

#### Diagnostic de chaussée

- **Auscultation**
  - Relevé des dégradations
  - Mesure de déflexion et sondages **[contrôle]**

#### Préparation du support

- **Purges**
  - Délimitation des zones à purger
  - Purge et reconstitution
  - Contrôle des purges **[contrôle]**
- **Rabotage**
  - Rabotage de l'ancien revêtement
  - Mise à niveau des regards
  - Reprofilage

#### Renforcement

- **Couche de renforcement**
  - Couche d'accrochage
  - Mise en œuvre de la grave-bitume ou du béton bitumineux
  - Contrôle de température et d'épaisseur **[contrôle]**

#### Couche de roulement

- **Revêtement**
  - Couche d'accrochage
  - Mise en œuvre de la couche de roulement
  - Prélèvement de carottes **[contrôle]**
  - Contrôle d'uni **[contrôle]**

#### Équipements

- **Accotements et drainage**
  - Reprise des accotements
  - Curage des fossés
- **Signalisation**
  - Marquage au sol
  - Remise en état de la signalisation verticale

#### Réception

- **Opérations préalables**
  - Nettoyage et repli du chantier
  - Visite de pré-réception **[contrôle]**
  - Plans de récolement
- **Réception**
  - Réception provisoire **[contrôle]**
  - Levée des réserves
  - Réception définitive **[contrôle]**

### Piste rurale

#### Préparation du chantier

- **Dossier et autorisations**
  - Vérification du dossier d'exécution
  - Autorisations et coordination avec les concessionnaires
  - Agrément des carrières et formules
- **Installation de chantier**
  - Base vie et stockage
  - Signalisation temporaire et déviations
  - Laboratoire de chantier
- **Implantation**
  - Levé topographique et profils
  - Piquetage de l'axe
  - Réception de l'implantation **[contrôle]**

#### Terrassements

- **Plateforme**
  - Débroussaillage
  - Déblais et remblais
  - Essai de compactage des remblais **[contrôle]**

#### Assainissement

- **Ouvrages**
  - Buses et dalots
  - Radiers submersibles
  - Fossés

#### Chaussée

- **Couche de roulement en matériau**
  - Approvisionnement en matériau
  - Contrôle du matériau **[contrôle]**
  - Mise en œuvre et arrosage
  - Compactage
  - Essai de densité **[contrôle]**
- **Revêtement éventuel**
  - Imprégnation
  - Enduit bicouche

#### Équipements

- **Signalisation**
  - Panneaux et balises

#### Réception

- **Opérations préalables**
  - Nettoyage et repli du chantier
  - Visite de pré-réception **[contrôle]**
  - Plans de récolement
- **Réception**
  - Réception provisoire **[contrôle]**
  - Levée des réserves
  - Réception définitive **[contrôle]**

### Réseau d'eau potable

#### Préparation du chantier

- **Dossier et autorisations**
  - Vérification du dossier d'exécution
  - Autorisations de voirie
  - Repérage des réseaux existants auprès des concessionnaires
- **Installation de chantier**
  - Base vie et stockage
  - Signalisation temporaire et déviations
- **Implantation**
  - Piquetage du tracé
  - Sondages de reconnaissance
  - Réception de l'implantation **[contrôle]**

#### Terrassement des tranchées

- **Tranchée**
  - Découpe de la chaussée
  - Ouverture de la tranchée
  - Blindage si nécessaire
  - Contrôle de la cote et de la pente **[contrôle]**
- **Lit de pose**
  - Mise en place du lit de sable
  - Réception du lit de pose **[contrôle]**

#### Pose des conduites

- **Conduites**
  - Approvisionnement et contrôle des tuyaux
  - Pose et assemblage
  - Soudure ou raccords
  - Grillage avertisseur
- **Accessoires**
  - Vannes et ventouses
  - Vidanges
  - Massifs d'ancrage
  - Regards

#### Essais

- **Mise en pression**
  - Remblai partiel, joints dégagés
  - Essai de pression **[contrôle]**

#### Branchements

- **Branchements particuliers**
  - Prises en charge
  - Pose des compteurs

#### Remblai et réfection

- **Remblai**
  - Enrobage de la conduite
  - Remblai par couches compactées
  - Essai de compactage des remblais **[contrôle]**
- **Réfection**
  - Reconstitution de la chaussée
  - Réfection du revêtement

#### Mise en service

- **Désinfection**
  - Rinçage du réseau
  - Désinfection
  - Analyse de potabilité **[contrôle]**
- **Raccordement**
  - Raccordement au réseau existant
  - Mise en service

#### Réception

- **Opérations préalables**
  - Nettoyage et repli du chantier
  - Visite de pré-réception **[contrôle]**
  - Plans de récolement et remise au concessionnaire
- **Réception**
  - Réception provisoire **[contrôle]**
  - Levée des réserves
  - Réception définitive **[contrôle]**

### Réseau d'assainissement

#### Préparation du chantier

- **Dossier et autorisations**
  - Vérification du dossier d'exécution
  - Autorisations de voirie
  - Repérage des réseaux existants auprès des concessionnaires
- **Installation de chantier**
  - Base vie et stockage
  - Signalisation temporaire et déviations
- **Implantation**
  - Piquetage du tracé
  - Sondages de reconnaissance
  - Réception de l'implantation **[contrôle]**

#### Terrassement des tranchées

- **Tranchée**
  - Découpe de la chaussée
  - Ouverture de la tranchée de l'aval vers l'amont
  - Rabattement de nappe si nécessaire
  - Blindage si nécessaire
  - Contrôle de la cote et de la pente **[contrôle]**
- **Lit de pose**
  - Mise en place du lit de pose
  - Réception du lit de pose **[contrôle]**

#### Pose des collecteurs

- **Collecteurs**
  - Approvisionnement et contrôle des tuyaux
  - Pose de l'aval vers l'amont
  - Contrôle de la pente et de l'alignement **[contrôle]**
- **Regards**
  - Regards de visite
  - Tampons

#### Essais

- **Étanchéité**
  - Essai d'étanchéité **[contrôle]**
  - Inspection télévisée **[contrôle]**

#### Branchements

- **Branchements particuliers**
  - Boîtes de branchement
  - Raccordement au collecteur

#### Remblai et réfection

- **Remblai**
  - Enrobage du collecteur
  - Remblai par couches compactées
  - Essai de compactage des remblais **[contrôle]**
- **Réfection**
  - Reconstitution de la chaussée
  - Réfection du revêtement

#### Mise en service

- **Raccordement**
  - Raccordement au réseau existant
  - Curage de fin de chantier
  - Mise en service

#### Réception

- **Opérations préalables**
  - Nettoyage et repli du chantier
  - Visite de pré-réception **[contrôle]**
  - Plans de récolement et remise au concessionnaire
- **Réception**
  - Réception provisoire **[contrôle]**
  - Levée des réserves
  - Réception définitive **[contrôle]**

### Réseaux électriques et télécom enterrés

#### Préparation du chantier

- **Dossier et autorisations**
  - Vérification du dossier d'exécution
  - Autorisations de voirie
  - Repérage des réseaux existants auprès des concessionnaires
- **Installation de chantier**
  - Base vie et stockage
  - Signalisation temporaire et déviations
- **Implantation**
  - Piquetage du tracé
  - Sondages de reconnaissance
  - Réception de l'implantation **[contrôle]**

#### Génie civil

- **Tranchée**
  - Ouverture de la tranchée
  - Lit de sable
  - Contrôle de la profondeur **[contrôle]**
- **Fourreaux et chambres**
  - Pose des fourreaux
  - Grillage avertisseur
  - Chambres de tirage
  - Mandrinage des fourreaux **[contrôle]**

#### Tirage et équipements

- **Câbles**
  - Tirage des câbles
  - Jonctions et extrémités
- **Équipements**
  - Postes ou coffrets
  - Mise à la terre
  - Mesure de la prise de terre **[contrôle]**

#### Essais

- **Contrôles**
  - Essais des câbles **[contrôle]**

#### Remblai et réfection

- **Remblai**
  - Remblai par couches compactées
  - Essai de compactage des remblais **[contrôle]**
- **Réfection**
  - Réfection du revêtement

#### Mise en service

- **Raccordement**
  - Raccordement au réseau du distributeur
  - Mise sous tension

#### Réception

- **Opérations préalables**
  - Nettoyage et repli du chantier
  - Visite de pré-réception **[contrôle]**
  - Plans de récolement et remise au concessionnaire
- **Réception**
  - Réception provisoire **[contrôle]**
  - Levée des réserves
  - Réception définitive **[contrôle]**

### Terrassement général et plateforme

#### Préparation du chantier

- **Dossier et autorisations**
  - Vérification du dossier d'exécution
  - Autorisations administratives
  - Choix des fournisseurs et sous-traitants
- **Installation de chantier**
  - Clôture et accès
  - Base vie, eau et électricité de chantier
  - Panneau de chantier
  - Signalisation et sécurité
- **Implantation**
  - Levé du terrain
  - Implantation des ouvrages
  - Réception de l'implantation **[contrôle]**

#### Études de sol et mouvement des terres

- **Reconnaissance**
  - Étude géotechnique **[contrôle]**
  - Plan de mouvement des terres
  - Choix des zones de dépôt et d'emprunt

#### Dégagement

- **Préparation de l'emprise**
  - Débroussaillage
  - Décapage de la terre végétale et stockage
  - Déviation des eaux de ruissellement

#### Déblais

- **Déblais**
  - Extraction
  - Brise-roche si nécessaire
  - Transport et mise en dépôt
  - Suivi des volumes extraits **[contrôle]**

#### Remblais

- **Mise en remblai**
  - Préparation de l'assise
  - Réception de l'assise **[contrôle]**
  - Mise en œuvre par couches
  - Arrosage et compactage
  - Essai de compactage des remblais **[contrôle]**

#### Finition de la plateforme

- **Réglage**
  - Réglage fin
  - Talus
  - Drainage périphérique
  - Essai de portance de la plateforme **[contrôle]**
  - Levé topographique final **[contrôle]**

#### Réception

- **Opérations préalables**
  - Nettoyage et repli du chantier
  - Visite de pré-réception **[contrôle]**
  - Dossier des ouvrages exécutés
- **Réception**
  - Réception provisoire **[contrôle]**
  - Levée des réserves
  - Réception définitive **[contrôle]**

### Lotissement et VRD

#### Préparation du chantier

- **Dossier et autorisations**
  - Vérification du dossier d'exécution
  - Autorisations administratives
  - Choix des fournisseurs et sous-traitants
- **Installation de chantier**
  - Clôture et accès
  - Base vie, eau et électricité de chantier
  - Panneau de chantier
  - Signalisation et sécurité
- **Implantation**
  - Levé du terrain
  - Implantation des ouvrages
  - Réception de l'implantation **[contrôle]**

#### Terrassement général

- **Voiries et lots**
  - Décapage
  - Déblais et remblais
  - Essai de compactage des remblais **[contrôle]**
  - Bornage des lots

#### Réseaux humides

- **Assainissement**
  - Collecteurs
  - Regards et branchements
  - Essai d'étanchéité **[contrôle]**
- **Eaux pluviales**
  - Collecteurs et avaloirs
- **Eau potable**
  - Conduites et accessoires
  - Branchements
  - Essai de pression **[contrôle]**

#### Réseaux secs

- **Électricité**
  - Moyenne et basse tension
  - Poste de transformation
  - Éclairage public
  - Contrôle par le distributeur **[contrôle]**
- **Télécom**
  - Fourreaux et chambres

#### Voirie

- **Chaussée**
  - Couche de fondation
  - Couche de base
  - Essai de densité et de portance **[contrôle]**
- **Bordures et trottoirs**
  - Bordures et caniveaux
  - Trottoirs
- **Revêtement**
  - Couche de roulement
  - Contrôle d'épaisseur **[contrôle]**

#### Aménagements

- **Espaces communs**
  - Espaces verts
  - Signalisation

#### Réception

- **Opérations préalables**
  - Nettoyage et repli du chantier
  - Visite de pré-réception **[contrôle]**
  - Dossier des ouvrages exécutés
- **Réception**
  - Réception provisoire **[contrôle]**
  - Levée des réserves
  - Réception définitive **[contrôle]**
