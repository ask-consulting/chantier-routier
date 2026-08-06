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
| Durée | 15 min (`JWT_ACCESS_TTL`) | 30 jours (`JWT_REFRESH_TTL`) |
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

**Compromis assumé** : un compte désactivé garde un access token valide jusqu'à son
expiration (≤ 15 min). En échange, le guard ne touche jamais la base — c'est ce qui
rend le contexte extractible. Les refresh tokens, eux, sont révoqués immédiatement,
ce qui borne la fenêtre.

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
| POST | `/auth/register` | public — crée l'organisation **et** son premier admin |
| POST | `/auth/login` | public |
| POST | `/auth/refresh` | public (le refresh token *est* la preuve) |
| POST | `/auth/logout` | authentifié — sans corps = déconnexion de partout |
| POST | `/auth/change-password` | authentifié — révoque **toutes** les sessions |
| GET | `/auth/me` | authentifié — profil + permissions du rôle |
| GET | `/users` | `user:read` |
| POST | `/users` | `user:manage` |
| GET | `/users/:id` | `user:read` |
| PATCH | `/users/:id` | `user:manage` |
| DELETE | `/users/:id` | `user:manage` |

L'`organizationId` vient **toujours** du token, jamais de la requête : les routes
n'ont tout simplement pas de paramètre pour en désigner une autre.

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

`scrypt` de la bibliothèque standard Node — aucun module natif à compiler, ce qui
garde l'image Docker et le build free-tier Render simples. Mémoire-dur, donc plus
résistant au crackage GPU que PBKDF2.

Encodage : `scrypt$N$r$p$sel$clé`. Le hash est **auto-descriptif** : augmenter le
coût plus tard reste rétro-compatible, chaque ancien mot de passe se vérifie avec
ses propres paramètres.

Longueur minimale seulement (`MIN_PASSWORD_LENGTH`, 10 par défaut), pas de règle de
composition : « une majuscule, un chiffre » pousse vers `Password1!` tout en
réduisant l'espace de recherche. C'est la recommandation NIST 800-63B et ANSSI.

## 8. Variables d'environnement

```bash
JWT_ACCESS_SECRET=   # REQUIS — l'API refuse de démarrer sans. Générer avec :
                     # node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
JWT_ISSUER=chantia-identity
JWT_ACCESS_TTL=900        # 15 min
JWT_REFRESH_TTL=2592000   # 30 jours
MIN_PASSWORD_LENGTH=10
```

Pas de valeur par défaut pour le secret, volontairement : elle embarquerait une clé
de signature publiquement connue en production. Sur Render, `render.yaml` la fait
générer par la plateforme (`generateValue: true`).

## 9. Reste à faire

- **Limitation de débit sur `/auth/login` et `/auth/register`.** Rien ne freine
  aujourd'hui le bourrage d'identifiants. `@nestjs/throttler` + un `@Throttle` sur
  ces deux routes ; c'est une dépendance à ajouter.
- **Réinitialisation de mot de passe oublié** (token à usage unique par email) —
  demande un fournisseur d'envoi d'emails.
- **Purge des refresh tokens expirés** : `deleteExpired()` existe côté port et
  repository, mais aucun `@Cron` ne l'appelle encore.
- **Front web** : `apps/web` appelle encore l'API sans jeton (il envoyait
  `x-organization-id`, header supprimé) — il faut une page de connexion, le stockage
  du token et le refresh automatique.
