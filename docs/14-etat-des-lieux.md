# 14 — État des lieux et priorités

*Arrêté au 14 août 2026. Révisé le 17 août 2026.*

## Le constat en une phrase

**Les fondations sont plus solides que le produit.** L'authentification, le
multi-tenant, les permissions et l'architecture front tiendront des années — mais
un chef de chantier ne peut toujours rien pointer, et personne ne peut être invité
sans copier-coller une URL à la main.

Ce document classe ce qui manque. L'ordre est une décision prise, pas une
suggestion : sécurité, puis qualité de code, puis observabilité, puis le mobile,
puis le module utilisateurs complet avec les notifications. Le métier vient après.

> **Révision du 17 août.** Trois constats du 14 août étaient faux ou périmés, et
> ils le sont dans les deux sens. `packages/shared` était annoncé sans tests : il
> en a quarante, sur exactement ce que le document réclamait en premier. Les
> « cinq alertes » de dépendances en sont vingt-huit. Et la fuite de budget est
> fusionnée. Les corrections sont intégrées ci-dessous, pas listées à part : un
> état des lieux qu'on lit en diagonale doit être juste ligne à ligne.

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

### 1.2 Vingt-huit alertes de dépendances ouvertes

Le compte du 14 août — « cinq alertes » — était faux. `pnpm audit` en remonte
vingt-huit, dont dix-neuf sur des dépendances de production :

```
tout            28 alertes    1 critique · 18 hautes · 9 moyennes
production      19 alertes                 14 hautes · 5 moyennes
```

La critique (`vitest < 3.2.6`, lecture et exécution de fichier arbitraire quand
le serveur d'interface écoute) ne concerne que le développement. Les quatorze
hautes en production, non : au `brace-expansion`, `fast-uri`, `js-yaml` et
`postcss` déjà listés s'ajoutent `find-my-way`, `@fastify/static`, `sharp`,
`nanoid`, `esbuild` et `deepmerge-ts`.

**Action** — monter les versions, vérifier que `pnpm build` et la suite de tests
passent. La plupart sont des dépendances transitives : `pnpm.overrides` dans le
`package.json` racine règle celles que personne ne met à jour en amont.

Ce point passe **devant le reste de la priorité 1** : il est mécanique, et il
couvre quatorze alertes de production pour un après-midi.

### 1.3 Ni `helmet` ni en-têtes de sécurité

Aucun en-tête de protection n'est posé par l'API : ni `Content-Security-Policy`, ni
`Strict-Transport-Security`, ni `X-Content-Type-Options`.

**Action** — `@fastify/helmet`, configuré explicitement plutôt qu'au réglage par
défaut.

### 1.4 Dépendances déclarées et inutilisées

`@fastify/static` et `@fastify/cookie` figurent dans les dépendances sans qu'aucun
code ne les importe. Surface d'attaque gratuite — et pas théorique :
`@fastify/static` porte lui-même une des alertes hautes du point 1.2. Le retirer
règle les deux d'un coup.

**Action** — les retirer.

### 1.5 Le budget quittait le serveur ✅

*Fusionné (PR #17, commit `c147b26`).* `totalBudget` partait vers tous les rôles ;
masquer la colonne côté front ne retenait rien. Voir la PR pour le détail, y compris
la fuite par le tri, plus discrète.

---

## Priorité 2 — Qualité de code

### 2.1 Le lint ne couvre qu'un tiers du dépôt

```
apps/web        eslint src        ✓
apps/api        —
packages/shared —
```

`pnpm lint` a longtemps été un no-op complet : `turbo run lint` sans qu'aucun paquet
ne définisse la tâche, donc une CI verte sur rien. Le front est couvert depuis
l'architecture en features ; l'API et le paquet partagé ne le sont pas.

**Action** — une configuration ESLint pour `apps/api` et `packages/shared`. Pour
l'API, l'équivalent des règles de frontière du front : la couche `domain` ne doit
importer ni `infrastructure` ni `presentation`, et `identity` n'exporte rien vers
`app`. Ces règles sont documentées dans `06-api-conventions-ddd-cqrs.md` et
`08-identity-module.md` mais rien ne les vérifie.

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

Une réserve sur l'arabe : **il n'a jamais été relu par un locuteur natif.** Les
traductions sont plausibles, ce n'est pas la même chose que justes.
