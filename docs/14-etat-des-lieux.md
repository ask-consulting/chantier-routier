# 14 — État des lieux et priorités

*Arrêté au 14 août 2026. Révisé les 17 et 18, puis le 20 août 2026.*

## Le constat en une phrase

**Les fondations sont plus solides que le produit.** L'authentification, le
multi-tenant, les permissions et l'architecture front tiendront des années — mais
un chef de chantier ne peut toujours rien pointer, et personne ne peut être invité
sans copier-coller une URL à la main.

Ce document classe ce qui manque. L'ordre est une décision prise, pas une
suggestion : sécurité, puis qualité de code, puis observabilité, puis le mobile,
puis le module utilisateurs complet avec les notifications. Le métier vient après.

> **Révision du 20 août.** Deux points se ferment, et le diagnostic du 18 août
> était faux — c'est le plus utile des deux constats.
>
> **1.2 est clos.** Les alertes de dépendances sont à **zéro partout**, en
> production comme en développement, et les 86 tests du dépôt tournent de nouveau.
> Mais la cause n'était pas celle annoncée le 18 : `vite` n'est pas une dépendance
> de `vitest`, c'en est une **peer dependency**, et une `pnpm.override` ne
> s'applique pas à la résolution automatique d'une peer. Rejouer `pnpm install` —
> l'action prescrite ici même — ne changeait donc rien, silencieusement. Le détail
> est au point 1.2 : il vaut d'être lu, parce que la même erreur se reproduira au
> prochain paquet qui déclare une peer.
>
> **2.1 est clos aussi**, et il a ouvert 2.4 en se fermant. L'API et le paquet
> partagé ont leur configuration ESLint, les règles de frontière de `06` et `08`
> sont exécutoires, un hook de pre-commit lint ce qui est indexé, et la CI passe
> le lint en premier. La règle « `application` ne touche pas `infrastructure` »
> butait sur une quinzaine de fichiers : les erreurs métier héritaient de
> `HttpException`, donc aucune couche ne pouvait les tenir. Elles sont redevenues
> des erreurs de domaine (§2.4). Le trou de tests du web (2.2) reste ouvert.
>
> *(Révision du 18 août.)* Un seul point bouge, et il bouge dans les deux sens.
> Les alertes de dépendances sont passées de vingt-huit à quatre, et de dix-neuf
> à **zéro** en production — mais le travail qui les règle est encore dans un
> arbre de travail non committé, et **il casse la suite de tests** : plus une
> seule ligne de test ne s'exécute dans le dépôt. Le détail est au point 1.2, qui
> reste ouvert pour cette raison.
>
> *(Révision du 17 août : trois constats du 14 août étaient faux ou périmés dans
> les deux sens — `packages/shared` a quarante tests et non zéro, les « cinq
> alertes » en étaient vingt-huit, la fuite de budget est fusionnée. Les
> corrections sont intégrées ci-dessous, pas listées à part.)*

---

## Priorité 1 — Sécurité

### 1.1 Limitation de débit ✅

*Fait le 17 août.* `POST /auth/login` et `POST /auth/accept-invitation`
acceptaient un nombre illimité de tentatives ; la politique de mot de passe ne
protégeait que contre les tentatives *lentes*. C'était le seul point de ce
document où l'absence était un risque immédiat plutôt qu'une dette.

`@nestjs/throttler` est en place sur `AuthController`, avec deux fenêtres qui
arrêtent deux attaques différentes :

| fenêtre | défaut | ce qu'elle arrête |
|---|---|---|
| par adresse | 20 / minute | un appelant qui essaie beaucoup de mots de passe |
| par email | 10 / quart d'heure | beaucoup d'adresses qui essaient **un** compte |

La seconde est celle qui compte : un botnet change d'IP gratuitement, donc une
limite par adresse seule ne protège rien. L'email testé, lui, ne se change pas —
c'est la cible.

Trois décisions qui ne se lisent pas dans la configuration :

- **Le compteur est partagé entre les routes**, pas posé par route. La clé par
  défaut de la bibliothèque inclut le nom du handler, ce qui offrirait un budget
  neuf à chaque endpoint : épuiser `login`, continuer sur `accept-invitation`.
- **`X-Forwarded-For` se lit par la droite**, en remontant le nombre de proxies
  qu'on déclare (`TRUSTED_PROXY_HOPS`, à `1` sur Render). Les maillons de gauche
  sont forgeables par l'appelant ; prendre le premier — le réflexe — rend le
  limiteur décoratif, chaque tentative tombant dans un compteur neuf. Laisser `0`
  derrière un proxy est aussi mauvais dans l'autre sens : tout le trafic passe
  pour une seule adresse et les vingt premiers appels bloquent tout le monde.
- **Le 429 ne dit rien** de la limite franchie ni de l'existence du compte. Un
  429 qui répond différemment selon l'email est un oracle d'énumération déguisé
  en limiteur.

Le stockage est en mémoire : correct pour une instance, et pour une seule. Une
seconde réplique doublerait chaque allocation — c'est le prix d'un passage à
l'échelle horizontale, et rien d'autre ne changera ce jour-là.

**Reste à faire** — le front ne sait pas encore présenter un 429. La bibliothèque
répond `retry-after-ip` plutôt que le `Retry-After` standard quand les fenêtres
sont nommées ; à traduire côté client au moment d'écrire l'écran.

### 1.2 Alertes de dépendances ✅

*Fait le 20 août.* Le compte du 14 août — « cinq alertes » — était faux ; il y en
avait vingt-huit, dont dix-neuf en production. `pnpm audit` :

```
avant   tout  28 alertes   1 critique · 18 hautes · 9 moyennes
        prod  19 alertes                14 hautes · 5 moyennes

après   tout   0 alerte
        prod   0 alerte
```

Onze `pnpm.overrides` à la racine ont fait le gros du travail —
`brace-expansion`, `fast-uri`, `js-yaml`, `postcss`, `find-my-way`, `sharp`,
`nanoid`, `deepmerge-ts` — et `@fastify/cookie`, qu'aucun code n'importait, a été
retiré (voir 1.4).

**La douzième surcharge, `vite: ^8.2.1`, n'a jamais rien fait.** Elle est en tête
du verrou, elle a l'air appliquée, et `vite@5.4.21` était résolu en dessous. Le
18 août ce document concluait à un verrou périmé et prescrivait de rejouer
l'installation. Rejouer l'installation ne change rien — vérifié :

```
✕ unmet peer vite@^8.2.1: found 5.4.21
```

`vite` n'est pas une dépendance de `vitest`, c'en est une **peer dependency**, et
`pnpm.overrides` ne s'applique pas à la peer qu'`autoInstallPeers` installe à
votre place. Une surcharge qui vise une peer est acceptée, écrite dans le verrou,
et sans effet : elle échoue en silence, ce qui est la pire des trois façons
d'échouer. Un avertissement d'installation le disait, noyé dans la sortie.

**La correction est de déclarer la peer, pas de la surcharger.** `vite ^8.2.2`
est passé en `devDependencies` de `apps/api` et de `packages/shared` — celui qui
en a besoin la nomme. La surcharge est retirée : la laisser en place aurait
entretenu l'idée qu'elle tenait quelque chose.

Deux conséquences ont suivi, et aucune n'était visible avant que les tests
redémarrent :

- **Les décorateurs de paramètre ne se compilaient plus dans les specs.** Vite 8
  transforme avec oxc, qui applique par défaut les décorateurs TC39 et refuse
  `login(@Body() body)` à la lecture. Oxc lit pourtant `experimentalDecorators`
  dans `tsconfig.json` — mais ce fichier exclut les specs : le code de
  production passait, `**/*.spec.ts` échouait. L'option est donc posée explicitement
  dans `vitest.config.mts`, `emitDecoratorMetadata` compris, faute de quoi Nest
  construit un contrôleur dont les dépendances sont `undefined`.
- **`vitest.config.ts` est devenu `.mts`.** Vite 8 avertit qu'il charge un
  fichier ESM comme du CommonJS ; l'extension le règle, et `import.meta.dirname`
  remplace `__dirname`, qui n'existe pas en ESM.

État final : `pnpm audit` net, 46 tests sur `apps/api`, 40 sur `packages/shared`,
`pnpm build` et `pnpm typecheck` verts.

### 1.3 Ni `helmet` ni en-têtes de sécurité

Aucun en-tête de protection n'est posé par l'API : ni `Content-Security-Policy`, ni
`Strict-Transport-Security`, ni `X-Content-Type-Options`.

**Action** — `@fastify/helmet`, configuré explicitement plutôt qu'au réglage par
défaut.

### 1.4 Dépendances déclarées et inutilisées — une sur deux

`@fastify/cookie` est retiré (branche `fix/api-dependency-alerts`).
`@fastify/static` est resté, et a été **monté** de `^8` à `^10` : la version règle
son alerte, mais aucun code ne l'importe toujours. On a payé une montée de version
majeure pour un paquet qu'on peut supprimer.

**Et la montée casse une plage de peer**, ce qu'on ne voyait pas le 18 août :

```
@nestjs/platform-fastify 11.1.28
  ✕ unmet peer @fastify/static@"^8.0.0 || ^9.0.0": found 10.1.3
```

C'est le seul avertissement de peer qui reste à l'installation. Il ne casse rien
aujourd'hui — précisément parce que personne n'importe le paquet — mais il place
Nest devant une version qu'il ne déclare pas supporter, pour un service dont on
n'a pas l'usage.

**Action** — le retirer plutôt que le maintenir. La suppression règle l'alerte et
l'avertissement d'un coup, sans montée de version du tout.

### 1.5 Le budget quittait le serveur ✅

*Fusionné (PR #17, commit `c147b26`).* `totalBudget` partait vers tous les rôles ;
masquer la colonne côté front ne retenait rien. Voir la PR pour le détail, y compris
la fuite par le tri, plus discrète.

---

## Priorité 2 — Qualité de code

### 2.1 Le lint couvre le dépôt ✅

*Fait le 20 août.*

```
apps/web        eslint src        ✓   (features, déjà en place)
apps/api        eslint src        ✓
packages/shared eslint src        ✓
```

`pnpm lint` a longtemps été un no-op complet : `turbo run lint` sans qu'aucun
paquet ne définisse la tâche, donc une CI verte sur rien. Puis un tiers du dépôt,
depuis l'architecture en features. Les trois paquets sont couverts.

**Ce que les règles vérifient, et pourquoi celles-là.** Le socle est
`eslint:recommended` et `typescript-eslint/recommended` sur les deux nouveaux
paquets. Ce qui compte est au-dessus : les frontières documentées dans `06` et
`08` étaient de la prose, et une prose ne s'exécute pas.

| paquet | règle | ce qu'elle empêche |
|---|---|---|
| api | `domain` n'importe rien | ni `infrastructure`, ni `presentation`, ni `application`, ni `@nestjs/*`, ni `@prisma/client` |
| api | `application` et `presentation` passent par les ports | l'import direct d'un repository, d'un mapper, de Prisma |
| api | `infrastructure` ne remonte pas | ni vers `presentation`, ni vers `application` |
| api | rien sous `app/` n'importe `identity/` | l'unique porte est `app.module.ts`, qui câble le module Nest |
| api | `identity/` n'importe aucun module métier | le jour de l'extraction, il part seul |
| shared | aucun module natif Node | `fs`, `crypto`, `process`… qui cassent React Native sans casser l'API |

Trois décisions qui ne se lisent pas dans la configuration :

- **Il n'y a aucune exception à ces règles.** Il y en a eu une pendant une heure,
  pour `infrastructure/exceptions/`, et la lever a appris quelque chose : ces
  classes n'étaient pas mal rangées, elles étaient d'une autre nature. Elles
  héritaient de `HttpException` et portaient leur code de statut — c'étaient des
  réponses HTTP, et c'est pour ça qu'aucune couche ne pouvait les tenir. Voir
  §2.4.
- **Côté `shared`, la règle ne liste que les modules natifs.** Le paquet ne
  déclare aucune dépendance, et l'isolation de `node_modules` par pnpm fait que
  tout import non déclaré ne résout pas : `tsc` échoue avant qu'ESLint soit
  consulté. Les modules natifs sont le seul trou que ça laisse — ils résolvent
  partout, sans dépendance. La règle vise ce trou, et rien d'autre.
- **Les règles ont été vérifiées en écrivant les infractions.** Un import interdit
  par paquet, passé au linter, avant de supprimer les fichiers d'essai. Une règle
  de frontière qui ne se déclenche jamais est une CI verte sur rien, en plus
  petit.

**Le hook de pre-commit.** `husky` + `lint-staged` : `.husky/pre-commit` lance
ESLint sur **les seuls fichiers indexés**, avec `--fix` (lint-staged réindexe ce
qu'il réécrit) et `--max-warnings=0`. Il ne construit pas, ne typecheck pas et ne
teste pas : ces trois-là demandent tout l'espace de travail et transformeraient un
commit de trois secondes en quatre-vingt-dix, ce qui est exactement comme ça qu'un
hook finit contourné au `--no-verify` par habitude.

Chaque paquet est linté depuis son propre dossier (`pnpm --filter … exec eslint`) :
ESLint 9 résout une configuration *plate* depuis le répertoire courant et non
depuis le fichier linté, donc un seul ESLint lancé à la racine appliquerait
silencieusement la configuration de la racine — qui n'existe pas — aux trois
paquets.

Un hook est une commodité, pas une garantie : il se saute au `--no-verify` et il
n'existe pas sur une machine où `pnpm install` n'a jamais tourné. **Le garde-fou
réel est la CI**, où le lint est passé en **premier** — trois secondes contre
trente pour le build, et un échec y signifie soit un hook contourné, soit un
fichier modifié que l'auteur n'a pas indexé.

**Reste à faire** — les règles de frontière du front vivent dans
`apps/web/eslint.config.mjs`, celles de l'API dans `apps/api/eslint.config.mjs`.
Rien n'est partagé entre les trois configurations : le jour où une quatrième
apparaît (le mobile), il faudra un paquet `@chantia/eslint-config` plutôt qu'un
quatrième copier-coller.

### 2.2 Le trou est sur le web, pas sur le paquet partagé

Le décompte du 14 août — « 27 tests, `packages/shared` à zéro » — regardait
`apps/` seulement et concluait faux sur le reste. Le compte réel :

```
apps/api          46 tests   (5 fichiers)
packages/shared   40 tests   (3 fichiers)
apps/web           0         Vitest n'est pas installé
```

`packages/shared` couvre la politique de mot de passe (26), `ROLE_PERMISSIONS` (8)
et le calcul de coût (6) — c'est-à-dire exactement l'action classée en premier
par rendement ci-dessous, faite depuis les commits qui ont amené ces fonctions.
Elle est retirée de la liste.

Ce qui reste vrai : côté API, les tests portent sur des failles trouvées après
coup — une élévation de privilège, une fuite de budget — plus la limitation de
débit ajoutée au point 1.1. Le parcours d'authentification lui-même n'est couvert
par rien.

**Action, par ordre de rendement :**

1. `apps/api` — le parcours d'authentification de bout en bout : connexion,
   rotation du jeton, détection de réemploi, acceptation d'invitation.
2. `apps/web` — Vitest n'est même pas installé. Commencer par les hooks de
   `model/`, qui sont testables sans rendu.

### 2.3 Aucun seuil de couverture

Rien n'empêche la couverture de baisser. Poser un seuil bas mais réel — et qui ne
descend jamais — vaut mieux qu'un objectif élevé que personne ne tient.

### 2.4 Les erreurs métier ne sont plus des réponses HTTP ✅

*Fait le 20 août.* Écrit en dernier parce que c'est le lint qui l'a révélé : la
règle « `application` ne touche pas `infrastructure` » butait sur une quinzaine de
fichiers, tous pour la même raison.

`ResourceNotFoundException`, `InvalidCredentialsException` et leurs huit voisines
héritaient de `HttpException` et portaient leur propre code de statut. Rangées
sous `infrastructure/exceptions/`, levées depuis `application/`, attrapées dans un
repository, relayées par un garde : **aucune des quatre couches ne pouvait les
tenir légalement**, parce que ce n'étaient pas des erreurs de domaine du tout.
C'étaient des réponses HTTP habillées en exceptions.

Ce qui a changé :

```
identity/domain/exceptions/       les 9 erreurs, en simples Error
app/shared/domain/exceptions/     ResourceNotFoundException
app/shared/domain/domain.exception.ts       la base + le kind sémantique
app/shared/presentation/domain-exception.filter.ts   la seule traduction en HTTP
app/shared/presentation/exceptions/         ValidationException, qui reste HTTP
```

Une erreur dit maintenant **ce qui ne va pas**, jamais **quoi répondre** : elle
porte un `kind` (`not-found`, `unauthenticated`, `forbidden`, `conflict`,
`invalid-input`) et le filtre global fait la correspondance. Deux effets qui
comptent : un handler se teste sans framework, et le jour où un second transport
apparaît, les codes de statut ne partent pas avec le domaine.

Le cas qui justifie le `kind` plutôt qu'un numéro : `RegistrationClosedException`
répond **404 alors qu'elle veut dire « interdit »** — répondre 403 reviendrait à
annoncer que l'inscription existe dans ce déploiement. C'est une décision de
présentation ; elle vit dans la table du filtre, pas dans la classe qui lève.

`ValidationException` n'a pas suivi : elle n'est levée que par la fabrique du
`ValidationPipe` dans `main.ts`, c'est-à-dire du HTTP dans la racine de
composition. Elle reste un `HttpException`, sous `presentation/`.

**Le corps de réponse est inchangé**, volontairement : mêmes clés, mêmes statuts,
même tableau `errors[]` avec les codes i18n que le front lit pour marquer les
règles de mot de passe non tenues. Le déplacement change où la décision vit, pas
ce que l'appelant reçoit. **Réserve** — cette équivalence est tenue par
construction, pas par un test : le filtre n'est couvert par rien. C'est le premier
candidat de la liste 2.2.

---

## Priorité 3 — Observabilité

### 3.1 Une erreur en production n'est vue par personne

Aucun suivi d'erreurs. Un plantage chez un utilisateur ne laisse aucune trace
consultable, et on l'apprendra par un appel téléphonique.

**Action** — Sentry sur l'API et sur le front. Le palier gratuit suffit largement à
cette échelle.

### 3.2 Journalisation non structurée

Ni `pino` ni `winston` configurés. Les journaux Render sont du texte libre :
illisibles à la recherche, et sans identifiant de corrélation entre une requête
front et la trace serveur correspondante.

**Action** — journalisation structurée JSON, avec un identifiant de requête propagé
depuis le front.

### 3.3 Aucun environnement avant la production

```
develop  →  Render  →  production
```

Une PR fusionnée est en ligne. Il n'existe aucun endroit où voir tourner le code
avant les vrais utilisateurs.

**Action** — un service Render de préproduction sur `develop`, et la production
promue depuis `main`. La bascule est un changement de branche suivie, pas une
refonte.

### 3.4 Sauvegarde jamais testée

Supabase sauvegarde. La procédure de restauration n'a jamais été écrite ni essayée
— une sauvegarde qu'on n'a pas restaurée une fois n'est pas une sauvegarde.

**Action** — écrire la procédure, la dérouler une fois sur une base jetable, noter
le temps que ça prend.

### 3.5 Les données périmées s'accumulent

`deleteExpired()` existe pour les jetons de rafraîchissement et les invitations.
Rien ne l'appelle.

**Action** — une tâche planifiée quotidienne.

---

## Priorité 4 — Application mobile

### Le problème

Le périmètre MVP définit quatre rôles. Deux d'entre eux n'ont aucun client :

| rôle | accès prévu | réalité |
|---|---|---|
| Admin / Direction | Web + Mobile | web |
| Conducteur de travaux | Web + Mobile | web |
| **Chef de chantier** | **Mobile uniquement** | **rien** |
| **Ouvrier** | **Mobile uniquement** | **rien** |

Et le « cœur différenciant » annoncé — le pointage avec mode hors-ligne et
géolocalisation — est mobile par nature.

En l'état, Chantia est un outil de direction. Ce n'était pas le projet décrit.

### Trois options

| option | avantage | coût |
|---|---|---|
| **PWA** sur le front existant | réutilise tout : design system, i18n, session, permissions | le hors-ligne demande un service worker et une file de synchronisation |
| **React Native** | plus fidèle au terrain, accès natif complet | une troisième application à construire **et à maintenir** |
| **Web seul en v1** | rien à construire | il faut réécrire le périmètre MVP, et le chef de chantier reste sans outil |

**Recommandation : la PWA.** Le pointage hors-ligne y est faisable — `IndexedDB`
pour la file, l'API de géolocalisation pour la preuve de présence — et ça évite
d'ouvrir un troisième chantier avant d'avoir fini le premier. L'architecture en
features et le design system sont déjà là ; une application native repartirait de
zéro sur les deux.

---

## Priorité 5 — Module utilisateurs complet, web et mobile, avec les notifications

### 5.1 Les invitations ne partent pas

Le module crée le lien et publie `UserInvitedEvent`. **Rien ne l'envoie.**

Conséquence : inviter quelqu'un demande à l'admin de copier une URL et de la
transmettre par un autre canal. Tant que ça dure, l'application reste à un seul
utilisateur — c'est ce qui bloque tout usage réel, et c'est le plus petit chantier
de ce document.

`UserInvitedEvent` ne transporte **jamais** le jeton, seulement `invitationPath`.
Cette contrainte reste : le module de notification reconstruit l'URL, il ne reçoit
pas un secret par la bande.

### 5.2 Le module de notification

Multi-canal à terme — email, SMS, et davantage — avec des gabarits par langue.
Pour la première livraison, **le canal email seul suffit** : c'est lui qui débloque
l'invitation.

Les gabarits doivent exister en français et en arabe dès le départ. Le compte porte
déjà sa langue (`User.locale`), donc le canal sait dans quelle langue écrire — mais
seulement si les gabarits sont bilingues d'emblée. Les ajouter après coup revient à
repasser sur chaque gabarit.

### 5.3 Ce qui manque au module utilisateurs

Le back est complet : invitation, acceptation, changement de rôle, désactivation,
changement de mot de passe. Le **front n'expose rien de tout ça** — il n'y a ni
écran de liste des comptes, ni écran d'invitation, ni gestion de son propre profil.

À construire, sur web **et** sur mobile :

- liste des comptes, avec rôle et état
- inviter, relancer une invitation, révoquer
- changer un rôle, désactiver un compte
- profil : nom, langue, mot de passe

Le garde-fou existant côté API doit rester visible côté front : on ne peut ni se
désactiver soi-même, ni changer son propre rôle, ni retirer le dernier admin.

---

## Priorité 6 — Le reste

Dans l'ordre de dépendance, une fois les cinq priorités ci-dessus tenues.

| module | schéma Prisma | code | dépend de |
|---|---|---|---|
| **Ouvriers** | ✓ | — | — |
| **Pointage** | ✓ | — | ouvriers |
| **Dépenses** | ✓ | — | chantiers |
| **Tableau de bord** | — | — | les trois précédents |

**Commencer par les ouvriers** : le pointage et le calcul du coût de main-d'œuvre en
dépendent tous les deux.

Le module chantier lui-même est incomplet : ni modification ni suppression, et pas
de budget par poste (terrassement, enrobé, signalisation) alors que le périmètre le
demande.

---

## Annexe — Ce qui est construit

Solide et documenté :

- **Identité** — contexte borné, schéma Postgres propre, aucune clé étrangère ne
  traverse la frontière (`08-identity-module.md`)
- **Authentification** — JWT de 5 minutes, jeton de rafraîchissement rotatif avec
  détection de réemploi, inscription fermée, invitations par lien
- **Limitation de débit** — deux fenêtres sur les routes d'authentification, par
  adresse et par email, compteur partagé entre les routes (§1.1)
- **Permissions** — matrice statique partagée entre l'API et les clients, aucune
  requête pour autoriser
- **Multi-tenant** — extension Prisma, filtre automatique, activable et
  désactivable (`09-multi-tenant.md`)
- **Conventions de base** — nommage, contraintes, index (`10-conventions…`)
- **Design system** — jetons, thème clair et sombre, logo (`11-design-system.md`)
- **Internationalisation** — français et arabe, RTL (`12-internationalisation.md`)
- **Architecture front** — features cloisonnées, frontières tenues par ESLint
  (`13-architecture-front.md`)
- **Frontières de l'API** — les flèches DDD de `06` et le mur autour d'`identity`
  de `08` sont exécutoires, hook de pre-commit et lint en tête de CI (§2.1)

Une réserve sur l'arabe : **il n'a jamais été relu par un locuteur natif.** Les
traductions sont plausibles, ce n'est pas la même chose que justes.
