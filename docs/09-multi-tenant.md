# 09 — Multi-tenant : comment l'isolation fonctionne

> Chaque organisation cliente est un **tenant**. Une donnée d'un tenant ne doit jamais
> être visible d'un autre. Ce document explique par quel mécanisme, où il s'applique,
> où il ne s'applique pas, et ce qu'il faut faire en écrivant un nouveau module.

## 1. Le modèle : une base, une colonne

Trois stratégies classiques existent — une base par client, un schéma par client, ou une
colonne discriminante. On a retenu la troisième : **une seule base, une colonne
`organizationId`**.

| | Pourquoi ce choix |
|---|---|
| Coût | Le free tier Supabase, c'est une base. Une base par client est hors budget. |
| Migrations | Une migration à appliquer, pas N. |
| Requêtes transverses | Les stats produit restent un simple `GROUP BY`. |
| Risque | Une erreur de filtre expose les données d'autrui — d'où tout ce qui suit. |

Le tenant lui-même vit dans `identity.organizations`. Toutes les autres tables le
référencent par un **UUID opaque**, sans clé étrangère traversant le contexte Identity
(voir `08-identity-module.md` §1).

## 2. D'où vient le `organizationId`

De nulle part d'autre que du **token d'accès vérifié**.

```
POST /auth/login  →  JWT signé contenant { sub, org, role, email }
                         │
     Authorization: Bearer <token>
                         │
                   JwtAuthGuard vérifie la signature
                         │
                   claims.org  →  le tenant de l'appelant
```

Le client ne choisit jamais son tenant : il n'y a **aucun paramètre** pour le désigner —
ni header, ni query, ni corps de requête. Un header `x-organization-id` a existé comme
bouchon avant l'authentification ; il a été supprimé, et il ne doit pas revenir.

Dans un contrôleur :

```ts
@Get()
@RequirePermissions(Permission.WORKSITE_READ)
async findAll(@CurrentUser('organizationId') organizationId: string) { … }
```

## 3. Les deux couches de protection

### Couche 1 — le filtre explicite dans les handlers

Les query handlers passent `organizationId` au repository, et vérifient l'appartenance
sur les lectures par id :

```ts
const worksite = await this.repository.findById(query.id);
if (!worksite || worksite.organizationId !== query.organizationId) {
  throw new ResourceNotFoundException('Worksite', query.id);
}
```

> **404, jamais 403.** Un `403` sur une ressource d'un autre tenant confirmerait que
> l'id existe — donc qu'un concurrent est client. L'absence est la seule réponse qui
> n'apprend rien.

### Couche 2 — le filtre automatique (extension Prisma)

La couche 1 marche… jusqu'au jour où quelqu'un oublie. Une **extension Prisma** injecte
donc le filtre toute seule. C'est l'équivalent des `SQLFilter` de Doctrine
(`$em->getFilters()->enable('tenant')`), que Prisma n'offre pas en natif — le mécanisme
sous-jacent est `$extends({ query: { $allModels: { $allOperations } } })`.

**La règle :**

| Situation | Comportement |
|---|---|
| La table a une colonne `organizationId` **et** l'appelant est authentifié | filtre injecté |
| La table n'a pas la colonne | table tenant-agnostique, laissée telle quelle |
| Aucun token (login, register, refresh) | pas de filtre |

La liste des modèles concernés est **dérivée du schéma** au démarrage
(`Prisma.dmmf.datamodel.models`), jamais écrite à la main : une liste manuelle serait
exactement l'oubli qu'on cherche à supprimer. Ajouter un modèle portant la colonne
suffit — il est filtré au prochain `prisma generate`, sans rien déclarer.

**Ce qui est couvert :**

- `where` — `findMany`, `findFirst`, `findUnique`, `count`, `aggregate`, `groupBy`,
  `update`, `updateMany`, `delete`, `deleteMany`, `upsert`.
- `data` — `create`, `createMany`, et le volet `create` de `upsert`.

**Le token gagne toujours.** Une charge utile qui désigne un autre tenant est écrasée,
pas honorée : aucune requête ne peut planter une ligne hors de son organisation. Et un
`updateMany({ where: {} })` ne devient pas « modifie tout » — il ne touche que les
lignes du tenant.

## 4. La mécanique

`AsyncLocalStorage` (module natif Node, **aucune dépendance ajoutée**) porte le tenant
sur toute la durée de la requête :

```
TenantContextMiddleware   ouvre un contexte vide      ← avant les guards
   └── JwtAuthGuard       y publie claims.org         ← après vérification du token
        └── extension     lit le contexte, injecte    ← à chaque requête Prisma
```

Middleware et non interceptor : un interceptor tourne **après** les guards, le contexte
n'existerait pas encore quand le guard veut le remplir.

Les repositories consomment le client filtré :

```ts
constructor(@Inject(TENANT_PRISMA) private readonly prisma: TenantPrismaClient) {}
```

Un jeton d'injection distinct de `PrismaService`, volontairement : lire
`@Inject(TENANT_PRISMA)` dit que les requêtes en dessous sont cloisonnées. Prendre
`PrismaService` à la place devient un choix visible en relecture. Les deux partagent le
**même pool de connexions** — `$extends` superpose un comportement, il n'ouvre pas une
seconde connexion, ce qui compte derrière un pooler free tier.

### Fichiers

| Rôle | Fichier |
|---|---|
| Contexte de requête | `app/shared/tenant/tenant-context.ts` |
| Ouverture du contexte | `app/shared/tenant/tenant-context.middleware.ts` |
| Extension | `app/shared/prisma/tenant.extension.ts` |
| Client + jeton | `app/shared/prisma/tenant-prisma.client.ts` |
| Interrupteur | `config/multi-tenant.config.ts` |

## 5. Activer / désactiver

Deux granularités, pour deux besoins différents.

### Dans le code — `disable()` / `enable()`

L'équivalent direct du `$em->getFilters()->disable('tenant')` de Doctrine, pour un
besoin ponctuel :

```ts
tenantContext.disable();
const toutesOrganisations = await prisma.worksite.findMany();
tenantContext.enable();
```

Pour la lecture transverse assumée : tâches de maintenance, outillage support,
statistiques produit.

**Portée : la requête en cours, et elle seule.** Le store étant créé par requête, un
`enable()` oublié — ou une exception entre les deux — laisse la suite de *cette*
requête non filtrée, sans jamais pouvoir affecter une autre. C'est ce qui rend la
paire impérative acceptable ici.

`isEnabled()` dit où on en est, si un code de bibliothèque doit s'en assurer.

Variante sûre quand le bloc peut lever :

```ts
const tout = await tenantContext.runUnscoped(() => prisma.worksite.findMany());
```

> Attention si tu réimplémentes ce genre de garde ailleurs : restaurer l'état dans un
> `finally` **ne marche pas** avec un callback asynchrone — le `finally` se déclenche
> au retour de la promesse, pas à sa résolution, et remet le filtre en plein vol.
> `runUnscoped` exécute donc le callback dans un store enfant, ce qui couvre toute la
> continuation asynchrone. Un test le vérifie.

### Pour tout le processus — `MULTI_TENANT_ENABLED=false`

Un cran au-dessus : un script de migration lancé en CLI, où il n'y a de toute façon
aucune requête HTTP ni aucun tenant. Actif par défaut — couper l'isolation doit être un
acte volontaire, jamais la conséquence d'une variable d'environnement absente.

Dans une API qui tourne, préfère toujours `disable()`/`enable()` : la fenêtre non
filtrée reste bornée à une requête au lieu de valoir pour tout le serveur.

## 6. Les deux limites, assumées

### Fail-open sans token

Pas d'appelant authentifié = pas de filtre. C'est ce qui fait fonctionner le login sans
second client Prisma : `findByEmail` s'exécute avant qu'aucun tenant ne soit connu.

La contrepartie : une route marquée `@Public()` **par erreur** lirait à travers les
tenants. Ce cas est journalisé en `WARN` (une fois par modèle + opération) plutôt que
passé sous silence :

```
[TenantExtension] Worksite.findMany ran with no tenant in context —
returning rows across every organization.
```

En fonctionnement normal on n'en voit que trois, toutes légitimes : `User.findUnique` et
`User.upsert` (login), `User.create` (register). **Toute autre occurrence est un bug.**
Basculer ce warning en exception est un changement d'une ligne, si la politique évolue.

### Relations imbriquées

Prisma interdit de muter `include` / `select` (ça changerait le type de retour), donc
les relations chargées par ce biais ne sont pas filtrées par l'extension. Sans danger
dans ce schéma : **tout chemin imbriqué descend d'une racine filtrée en suivant une clé
étrangère**. À revérifier si une relation venait un jour à traverser les tenants.

### Le cas `Timesheet` / `Expense`

Ces deux tables n'ont **pas** de colonne `organizationId` — décision de schéma, elles
pendent à `worksite`. L'extension ne les filtre donc pas. Tant qu'on y accède depuis un
chantier déjà filtré, c'est sûr.

Mais une requête **racine** sur ces tables — « tous les pointages en retard, tous
chantiers confondus », pour le gérant — doit porter son filtre à la main :

```ts
prisma.timesheet.findMany({
  where: { present: false, worksite: { organizationId } },
})
```

À traiter au moment du module `timesheet`. Si le `JOIN` devient coûteux, dénormaliser
`organizationId` sur ces deux tables les fera basculer automatiquement dans le champ de
l'extension — sans autre changement de code.

## 7. Ce que ça ne fait pas

- **Le périmètre intra-tenant.** « L'ouvrier ne voit que ses propres pointages » n'est
  pas du multi-tenant : c'est une règle métier, à écrire dans le query handler. Une
  permission donne le verbe, le tenant donne l'organisation ; **ni l'un ni l'autre ne
  donne le périmètre**.
- **Le SQL brut.** `$queryRaw` passe à côté de l'extension. Il n'y en a aucun
  aujourd'hui ; en ajouter un impose d'écrire le `WHERE` soi-même.
- **La défense en base.** Ce n'est pas du RLS Postgres : l'isolation est appliquée par
  l'application. Un accès direct à la base (psql, Studio) voit tout. Passer à RLS reste
  possible plus tard, au prix d'un rôle applicatif dédié et d'une transaction par
  requête.

## 8. Écrire un nouveau module

1. Le modèle Prisma porte `organizationId` + `@@index([organizationId])` → il est
   cloisonné automatiquement.
2. Le repository injecte `@Inject(TENANT_PRISMA)`, pas `PrismaService`.
3. Le contrôleur prend le tenant via `@CurrentUser('organizationId')` — **jamais** d'un
   paramètre de requête.
4. Les lectures par id vérifient l'appartenance et renvoient `404`.
5. `@Public()` uniquement si la route n'a vraiment besoin d'aucun appelant : elle
   tournera sans filtre.

Voir aussi `06-api-conventions-ddd-cqrs.md` §8 et la skill `create-cqrs-module`.

## 9. Vérifier que ça marche

Les tests unitaires du contexte (isolation entre requêtes concurrentes, `runUnscoped`,
dérivation depuis le schéma) sont dans
`app/shared/prisma/tenant.extension.spec.ts` :

```bash
pnpm --filter @chantia/api test
```

Le comportement d'injection a été vérifié en conditions réelles, en interrogeant le
client sans passer par les handlers — donc sans qu'aucun `organizationId` ne soit fourni
à la main :

| Scénario | Résultat |
|---|---|
| `findMany` en contexte tenant A | seulement les chantiers de A |
| `findUnique` sur l'id d'un chantier de B, en tant que A | `null` |
| `create` sans `organizationId` | estampillé tenant A |
| `create` visant explicitement B | forcé sur A |
| `updateMany({ where: {} })` | lignes de A uniquement, B intact |
| Sans contexte | tout, + `WARN` |
| `runUnscoped` | tout, sans warning |
