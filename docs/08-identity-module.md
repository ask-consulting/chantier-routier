# 08 — Module Identity : comptes, connexion, permissions

> Contexte borné **Identity** : organisations (tenants), comptes, sessions.
> Code en anglais, doc en français (cf. `06-api-conventions-ddd-cqrs.md`).

## 1. Pourquoi il vit hors de `src/app/`

```
apps/api/src/
├── app/          ← le métier (worksite, worker, timesheet…)
│   └── shared/auth/   ← le "kit consommateur" de token
└── identity/     ← ce module
```

Identity est conçu pour être **extractible en service autonome** le jour où ça a du
sens (SSO client, plusieurs produits partageant les comptes). Concrètement :

| Ce qu'il possède | Où |
|---|---|
| Sa config d'émission | `identity/config/identity.config.ts` |
| Ses 3 tables, et rien d'autre | schéma Postgres `identity` |
| Sa façade base | `IdentityPrismaService` (typée `Pick<…, 'organization' \| 'user' \| 'refreshToken'>`) |

**Aucune clé étrangère ne traverse la frontière.** `worksite.organizationId` et
`app_user.workerId` sont des UUID opaques, exactement comme au travers d'un appel
réseau. L'intégrité inter-contextes est le travail de l'application, pas de la base.
Le module **n'exporte rien** : le métier ne peut pas l'importer, même par accident.

Ce que le métier voit d'un appelant, c'est **uniquement les claims d'un token
vérifié** — jamais une jointure, jamais un appel repository.

## 2. Les deux moitiés de l'authentification

| | Émission | Vérification |
|---|---|---|
| Où | `identity/` | `app/shared/auth/` |
| Config | `identity.config.ts` (TTL, politique) | `auth.config.ts` (secret, issuer) |
| Après extraction | part avec le service Identity | **reste** dans l'API métier |

`app/shared/auth/` ne dépend que de `@chantia/shared` et de `JWT_ACCESS_SECRET`.
C'est un dossier copiable tel quel dans n'importe quel service qui doit garder ses
routes.

## 3. Les deux jetons

| | Access token | Refresh token |
|---|---|---|
| Forme | JWT signé HS256 | chaîne aléatoire **opaque** (48 octets) |
| Durée | **5 min** (`JWT_ACCESS_TTL`) | 30 jours (`JWT_REFRESH_TTL`) |
| Stocké en base | non | **hash SHA-256 uniquement** |
| Révocable | non, jusqu'à expiration | oui, immédiatement |

Le refresh token n'est **pas** un JWT : rien n'y est encodé, donc il ne peut être
validé qu'en base — c'est précisément ce qui rend la révocation et la rotation
possibles. Seul son SHA-256 est stocké : un dump de base n'est pas rejouable.

**Rotation + détection de rejeu.** Chaque refresh crée un nouveau token et révoque
l'ancien (`replacedBy` garde la trace de la famille). Présenter un token **déjà
tourné** est la signature d'un vol : le client légitime serait passé au
remplaçant. Comme on ne peut pas savoir lequel des deux est le voleur, **toute la
famille est révoquée** et les deux doivent se reconnecter.

**Compromis assumé** : le guard ne lit **jamais** la base. Un jeton est donc une
photographie prise à l'émission, et pendant sa durée de vie deux choses peuvent
être périmées — un compte désactivé continue d'accéder, et **un rôle modifié n'a
pas encore d'effet** (un admin rétrogradé garde ses droits). Le rôle est le cas le
plus gênant des deux.

En échange, le contexte reste extractible : ce guard fonctionnera sans changement
quand les jetons viendront d'un service distant.

La fenêtre est donc **le TTL, et rien d'autre** — d'où 5 minutes plutôt que 15.
Le coût est un `/auth/refresh` de plus toutes les cinq minutes par session active.

L'alternative — lire l'utilisateur en base dans le guard — a été évaluée et
écartée : elle fermerait la fenêtre, mais ferait d'Identity une **dépendance
synchrone sur le chemin critique de chaque requête** une fois extraite en
service, avec sa latence ajoutée partout et son indisponibilité arrêtant l'API
entière. Un cache de quelques secondes serait le compromis intermédiaire si le
besoin revenait.

Les refresh tokens, eux, **sont** vérifiés en base et révoqués immédiatement.

### Là où la fenêtre n'est pas acceptable

Toutes les routes ne se valent pas pendant ces cinq minutes. Le partage n'est pas
« lecture / écriture », c'est : **est-ce que l'effet survit au jeton ?**

| | Effet |
|---|---|
| Lire des chantiers | s'arrête avec la fenêtre |
| Se déconnecter, changer sa langue | inoffensif |
| **Changer un mot de passe** | survit |
| **Inviter quelqu'un, modifier un rôle** | survit |

Le cas grave n'est pas le mot de passe, c'est l'invitation : un **administrateur
désactivé** pourrait, dans ces cinq minutes, inviter un nouvel administrateur et
se recréer un accès **permanent** depuis un jeton qui allait expirer. Une
escalade de privilèges qui traverse la fenêtre.

`FreshAccountGuard` relit le compte sur ces routes-là et refuse en `403`.

**Il vit dans `identity/`, pas à côté de `JwtAuthGuard`.** Les opérations qui
accordent ou modifient un accès sont, par définition, celles de ce contexte —
c'est pourquoi les quatre routes concernées s'y trouvent toutes, et ce n'est pas
une coïncidence. Le garde lit `app_users`, **sa propre table** : rien ne traverse
de frontière, et le jour de l'extraction il part avec le contexte. L'API métier
garde son guard sans état et ne fait aucun appel supplémentaire.

Posé **au niveau du contrôleur** et non route par route : un nouvel endpoint de
gestion de comptes est protégé parce qu'il existe, pas parce que quelqu'un y a
pensé. Le prix est une lecture par clé primaire sur les routes de consultation
qui n'en ont pas besoin — un échange équitable contre l'oubli silencieux d'une
route d'écriture.

## 4. Permissions : la matrice `rôle → capacités`

Une route se garde par la **capacité** qu'elle exige, jamais par la liste des rôles
qui la détiennent aujourd'hui :

```ts
@RequirePermissions(Permission.WORKSITE_MANAGE)
```

La table vit dans `packages/shared/src/access/role-permissions.ts`, donc le **web et
le mobile importent exactement la même** pour griser ce que l'appelant ne peut pas
faire. L'UI et l'API ne peuvent plus diverger.

Les rôles étant statiques (pas d'éditeur de rôles par tenant), c'est une **constante,
pas une table**. L'autorisation ne fait donc aucune requête : le token suffit à
décider. C'est la différence majeure avec `cie-next`, dont le `PermissionsGuard` fait
un `SELECT` sur le profil à chaque requête.

| | admin | site_manager | foreman | worker |
|---|:--:|:--:|:--:|:--:|
| `worksite:read` | ✓ | ✓ | ✓ | ✓ |
| `worksite:manage` | ✓ | ✓ | | |
| `worker:read` / `:manage` | ✓ | ✓ | lecture | |
| `timesheet:read` / `:record` | ✓ | ✓ | ✓ | ✓ |
| `timesheet:manage` | ✓ | ✓ | ✓ | |
| `expense:read` / `:record` | ✓ | ✓ | ✓ | |
| `expense:manage` | ✓ | ✓ | | |
| `budget:read` / `:manage` | ✓ | ✓ | | |
| `user:read` | ✓ | ✓ | | |
| `user:manage` | ✓ | | | |

> **Une permission donne le verbe, pas le périmètre.** « peut lire les pointages »
> ne dit pas *lesquels*. Restreindre les lignes au propre périmètre de l'appelant
> reste le travail du query handler — jamais celui du guard.

### Trois décorateurs

| Décorateur | Effet |
|---|---|
| `@Public()` | route ouverte, pas de token |
| `@RequirePermissions(...)` | exige **toutes** les capacités listées |
| `@Roles(...)` | filtre grossier, pour la règle qui porte vraiment sur le rôle |

L'authentification est **active par défaut** : oublier un décorateur verrouille une
route au lieu de l'exposer.

## 4 bis. Le filtre multi-tenant automatique

Une extension Prisma injecte `organizationId` dans toute requête visant une table qui
porte cette colonne, dès lors que l'appelant est authentifié — le filet contre l'oubli.
Login, register et refresh tournent sans token, donc sans filtre, ce qui est exactement
ce qu'il leur faut : ils cherchent un compte avant que le tenant soit connu.

**Le détail complet est dans `09-multi-tenant.md`** : la règle, l'interrupteur global,
le `runUnscoped()` par appel, et les deux limites (fail-open sans token, relations
imbriquées).

## 5. Endpoints

| Méthode | Route | Accès |
|---|---|---|
| POST | `/auth/register` | **fermé** — répond 404, voir §5 bis |
| GET | `/auth/invitation/:token` | public — ce qu'affiche la page d'invitation |
| POST | `/auth/accept-invitation` | public — choisit un mot de passe et connecte |
| PATCH | `/auth/preferences` | authentifié — sa propre langue |
| POST | `/auth/login` | public |
| POST | `/auth/refresh` | public (le refresh token *est* la preuve) |
| POST | `/auth/logout` | authentifié — sans corps = déconnexion de partout |
| POST | `/auth/change-password` | authentifié — révoque **toutes** les sessions |
| GET | `/auth/me` | authentifié — profil + permissions du rôle |
| GET | `/users` | `user:read` |
| POST | `/users` | `user:manage` — **invite**, ne crée pas de mot de passe |
| GET | `/users/:id` | `user:read` |
| PATCH | `/users/:id` | `user:manage` |
| DELETE | `/users/:id` | `user:manage` |

L'`organizationId` vient **toujours** du token, jamais de la requête : les routes
n'ont tout simplement pas de paramètre pour en désigner une autre.

## 5 bis. Une seule organisation, et des invitations

### L'inscription est fermée

`/auth/register` répond **404** sauf si `ALLOW_SELF_REGISTRATION=true`.

Le produit ne sert qu'une organisation : une inscription publique ne créerait que
des locataires que personne n'a demandés, et une route d'inscription ouverte sur
un back-office privé est une invitation permanente.

404 plutôt que 403 : la route n'existe pas du point de vue de l'appelant, et
« interdit » annoncerait que ce déploiement *pourrait* faire de l'inscription.

Le code n'est pas supprimé pour autant — il est écrit et testé, et le
multi-locataire le voudra de nouveau. Il vit derrière un interrupteur.

### Le premier administrateur

Il faut bien un moyen de créer le premier compte :

```bash
BOOTSTRAP_ADMIN_EMAIL=vous@exemple.fr BOOTSTRAP_ADMIN_PASSWORD=… \
  pnpm --filter @chantia/api bootstrap:admin
```

Un script ponctuel plutôt qu'un crochet au démarrage : il s'exécute quand
quelqu'un le décide, le mot de passe vit quelques secondes dans un shell au lieu
de dormir indéfiniment dans l'environnement d'un serveur, et il ne peut pas se
déclencher par accident à un redémarrage.

**Idempotent** : si le compte existe, il le signale et ne touche à rien. Réinitialiser
silencieusement le mot de passe d'un administrateur en service depuis une variable
d'environnement est exactement ce qu'un script d'amorçage ne doit pas faire.

### Les autres comptes arrivent par invitation

```
ADMIN    POST /users { email, prénom, nom, rôle, langue }
         → { invitationPath: "/invitation/aB3x…", expiresAt }

INVITÉ   GET  /auth/invitation/:token     → son nom, son organisation
         POST /auth/accept-invitation     → choisit son mot de passe
         → connecté immédiatement
```

**L'admin ne choisit pas — et n'apprend jamais — le mot de passe de ses équipes.**
C'est toute la raison de ce mécanisme plutôt qu'un `POST /users { password }`.

Le jeton est **opaque, à usage unique, valable 7 jours**, et seul son SHA-256 est
stocké : même modèle de menace qu'un refresh token, parce qu'un lien qui voyage
par WhatsApp peut être transféré, capturé en photo, ou traîner des mois dans une
conversation.

Ré-inviter quelqu'un **annule le lien précédent** : sinon un ancien lien transféré
resterait vivant à côté du nouveau.

Le mot de passe n'est écrit qu'**avant** de brûler l'invitation : si l'invité se
trompe de mot de passe, le lien reste utilisable au lieu de l'enfermer dehors.

### L'envoi, sans l'attendre

*Depuis le 28 août.* `InviteUserHandler` appelle le use case du module de
notification, et **ne l'attend pas** :

```ts
this.notifications.executeDetached(new SendNotificationCommand(…));
```

`executeDetached` rend la main immédiatement et ne rejette jamais ; un échec
d'envoi finit en ligne de journal. La propriété exigée ici — un échec d'envoi ne
doit pas annuler la création d'un compte — est donc tenue par **la forme de
l'appel**, pas par un bus.

`UserInvitedEvent` reste publié, mais il n'achemine plus rien : c'est un fait sur
ce qui s'est passé, disponible pour un audit ou un fil in-app. Il ne porte
toujours **jamais le jeton**, seulement le chemin.

**Une dette assumée.** Ce handler importe un module métier, ce que le mur
autour d'`identity/` interdit partout ailleurs. L'exception est déclarée dans
`apps/api/eslint.config.mjs` et fait exactement un fichier de large : tout autre
fichier d'`identity/` est refusé. Le plan reste un `POST /notifications` sur son
propre service ; ce jour-là l'import devient un client HTTP et l'exception
disparaît.

### Un compte sans mot de passe

Entre l'invitation et son acceptation, `password_hash` est **NULL** : le compte
existe, porte un rôle, et ne peut pas s'authentifier. `canAuthenticate()` le
refuse.

À la connexion, un tel compte est traité **exactement comme un email inconnu** —
même erreur, même coût en temps. Dire « ce compte existe mais n'a pas encore de
mot de passe » confirmerait l'adresse à qui sonde.

## 5 ter. La langue

`app_users.locale` (`fr` ou `ar`), modifiable par chacun via
`PATCH /auth/preferences`.

Sur le compte et non dans un cookie : c'est une préférence de la **personne**, pas
de son navigateur, et elle la suit du poste de bureau au téléphone sur le chantier.

Séparé de `PATCH /users/:id`, qui est un acte d'administration protégé par
`user:manage` : choisir sa propre langue n'en est pas un.

L'énumération est partagée (`Locale` dans `@chantia/shared`), donc une langue
ajoutée doit être traitée des deux côtés ou rien ne compile.

## 6. Invariants protégés

- **Une organisation garde toujours un admin actif.** Supprimer, désactiver ou
  rétrograder le dernier admin renvoie `409` — sinon plus personne ne peut créer de
  compte et seul un accès direct à la base récupère le tenant.
- **Pas d'auto-sabordage** : un admin ne peut ni se supprimer, ni se désactiver, ni
  se rétrograder lui-même (`409`).
- **Un compte d'un autre tenant renvoie `404`, pas `403`** — un 403 confirmerait que
  l'id existe.
- **L'email est immuable** : c'est l'identifiant de connexion. `UpdateUserDto` n'a
  volontairement pas le champ.
- **`ouvrier@x.fr` inconnu et mot de passe faux renvoient la même erreur**, en un
  temps identique (`simulateVerify()` brûle le même CPU côté « email inconnu » —
  mesuré à 120 ms contre 124 ms).

## 7. Mots de passe

### Hachage

`scrypt` de la bibliothèque standard Node — aucun module natif à compiler, ce qui
garde l'image Docker et le build free-tier Render simples. Mémoire-dur, donc plus
résistant au crackage GPU que PBKDF2.

Encodage : `scrypt$N$r$p$sel$clé`. Le hash est **auto-descriptif** : augmenter le
coût plus tard reste rétro-compatible, chaque ancien mot de passe se vérifie avec
ses propres paramètres.

### Politique d'acceptation

Quatre règles de composition, une longueur minimale, et deux listes :

| Règle | Code d'erreur |
|---|---|
| Au moins `MIN_PASSWORD_LENGTH` caractères (10 par défaut) | `minLength` |
| Une majuscule | `uppercase` |
| Une minuscule | `lowercase` |
| Un chiffre | `digit` |
| Un caractère spécial (ni lettre, ni chiffre, ni espace) | `special` |
| Absent des 10 000 mots de passe les plus utilisés | `common` |
| Ne contient ni l'email, ni le nom, ni le nom de l'organisation | `contextual` |

Le code voyage tel quel jusqu'au client sous la forme
`form.errors.password.<règle>` — c'est une clé d'internationalisation, le front la
traduit. **Toutes** les violations sont renvoyées d'un coup, pour qu'un formulaire
puisse marquer tous les critères manquants en un aller-retour.

La politique vit dans `@chantia/shared` (`security/password-policy.ts`) : le
formulaire web appliquera exactement les mêmes règles en direct, sans redupliquer
les expressions régulières.

### Pourquoi les deux listes

Les règles de composition seules sont faibles, et c'est documenté :

| | longueur seule | composition seule | politique complète |
|---|---|---|---|
| `Password1:` | accepté | accepté | **refusé** (`common`) |
| `P@ssw0rd12` | accepté | accepté | **refusé** (`common`) |
| `Ellouze2026!` | accepté | accepté | **refusé** (`contextual`) |
| `motdepasse123` | accepté | refusé | refusé |
| `Kf7#tuileRouge` | accepté | accepté | accepté |

La comparaison ne porte pas sur la chaîne entière mais sur sa **racine** : on
rogne les chiffres et la ponctuation aux extrémités, et on annule le leet-speak.
Ajouter un `!` à la fin d'un mot de passe courant — exactement ce que les règles
de composition apprennent à faire — ne suffit donc pas à passer.

### Ce que ça coûte, et ce que ça ne couvre pas

- **Les phrases de passe longues sont refusées.** `correct horse battery staple`
  n'a ni majuscule, ni chiffre, ni caractère spécial. C'est le prix assumé des
  règles de composition. Les exempter au-delà de 20 caractères est une option
  écartée pour l'instant, à rouvrir si les utilisateurs se plaignent.
- **La liste est anglophone.** SecLists ne contient pas `motdepasse` ni
  `chantier` ; un complément français est ajouté à la main dans
  `common-passwords.ts`. Le correctif propre serait un corpus français.
- **Un mot de passe en écriture sans casse** (arabe, chinois) ne peut jamais
  satisfaire les règles de majuscule et minuscule.
- **Rien de tout cela ne protège du devinage en ligne.** Seule la limitation de
  débit le fait, et elle n'existe toujours pas (§9).

### Régénérer la liste

```bash
curl -sL https://raw.githubusercontent.com/danielmiessler/SecLists/master/Passwords/Common-Credentials/10k-most-common.txt \
  | tr 'A-Z' 'a-z' | awk 'length($0) >= 4' | sort -u > /tmp/top.txt
# puis reformer packages/shared/src/security/common-passwords.ts
# (une seule chaîne jointe par \n, cf. l'en-tête du fichier)
```

## 8. Variables d'environnement

```bash
JWT_ACCESS_SECRET=   # REQUIS — l'API refuse de démarrer sans. Générer avec :
                     # node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
JWT_ISSUER=chantia-identity
JWT_ACCESS_TTL=300        # 5 min — c'est la fenêtre de péremption d'un jeton
JWT_REFRESH_TTL=2592000   # 30 jours
MIN_PASSWORD_LENGTH=10

# Inscription publique, fermée par défaut (voir §5 bis).
ALLOW_SELF_REGISTRATION=false
# Durée de vie d'une invitation, en secondes (défaut 604800 = 7 jours).
INVITATION_TTL=604800
```

Pas de valeur par défaut pour le secret, volontairement : elle embarquerait une clé
de signature publiquement connue en production. Sur Render, `render.yaml` la fait
générer par la plateforme (`generateValue: true`).

## 9. Reste à faire

- **Limitation de débit sur `/auth/login` et `/auth/accept-invitation`.** Rien ne freine
  aujourd'hui le bourrage d'identifiants. `@nestjs/throttler` + un `@Throttle` sur
  ces deux routes ; c'est une dépendance à ajouter.
- **Réinitialisation de mot de passe oublié.** Le mécanisme d'invitation est déjà
  la moitié du travail : même table, même modèle de jeton. Il manque l'envoi.
- ~~**Module de notification.**~~ Fait le 28 août : table `notification_templates`
  par (sujet, canal, langue), semée par migration, canal email seul actif.
  Voir `14-etat-des-lieux.md` §5.2.
- **Purge des jetons expirés** : `deleteExpired()` existe pour les refresh tokens
  et pour les invitations, mais aucun `@Cron` ne l'appelle encore.
- **Front web** : `apps/web` appelle encore l'API sans jeton (il envoyait
  `x-organization-id`, header supprimé) — il faut une page de connexion, le stockage
  du token et le refresh automatique.
