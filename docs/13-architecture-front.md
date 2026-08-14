# Architecture du front

## Le problème que ça résout

Avant, `app/worksites/page.tsx` faisait 109 lignes : la requête, les clés de cache,
les couleurs de statut, le formatage monétaire et le tableau, dans un seul fichier.
Ça tient pour un écran. À cinq domaines — chantiers, ouvriers, pointages, dépenses,
comptes — chaque page réinvente les mêmes décisions, et elles divergent.

## Le découpage

```
src/
  app/                    routage. Une page monte un écran, rien d'autre.
  features/<domaine>/
    api/                  comment on parle au serveur
    model/                ce que la donnée veut dire
    ui/                   à quoi ça ressemble
    index.ts              la seule porte d'entrée
  shared/                 ui · api · i18n · theme · brand · lib
```

Trois dossiers par feature, et chacun répond à une seule question :

| dossier | contient | peut importer |
|---|---|---|
| `api/` | endpoints, clés de cache, hooks React Query | `shared/api` |
| `model/` | tons, règles d'affichage, validation, hooks d'orchestration | `api/`, `shared/lib` |
| `ui/` | composants et écrans | `model/`, `api/`, `shared/ui` |

**Le sens ne s'inverse jamais.** `api/` ignore que React existe — il est appelable
depuis un test ou un script. `ui/` ne connaît aucune URL. C'est la même discipline
que le back : `presentation → application → domain`.

## Les six règles

1. **Une feature ne s'atteint que par son `index.ts`.** `@/features/worksites/api/…`
   est interdit.
2. **Les features ne s'importent pas entre elles.** Seule exception, déclarée dans
   la config ESLint : `auth`, parce que masquer ce qu'un rôle ne peut pas faire est
   transverse.
3. **Un seul chemin d'écriture** : les mutations React Query, qui possèdent leur
   invalidation. Pas de server action ni de `fetch` manuel en parallèle.
4. **Aucun DTO redéclaré.** Les types viennent de `@chantia/shared`.
5. **Une seule fabrique de clés par feature.** Jamais de `queryKey: ['trucs']` écrit
   à la main.
6. **`shared/` ne connaît aucun domaine.** S'il a besoin d'une feature, ce n'est pas
   du partagé.

Les règles 1, 2 et 6 sont **tenues par ESLint** (`eslint.config.mjs`). Une violation
casse `pnpm lint`, elle ne se discute pas en revue.

---

## Créer un module

Exemple avec `workers`. Cinq fichiers, dans cet ordre.

### 1. `api/worker.api.ts` — le transport

```ts
import type { IWorker } from '@chantia/shared';
import { apiFetch, type Paginated } from '@/shared/api/http-client';

export interface WorkerListParams {
  page?: number;
  limit?: number;
}

export function fetchWorkers(params?: WorkerListParams): Promise<Paginated<IWorker>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  const suffix = query.size > 0 ? `?${query}` : '';
  return apiFetch<Paginated<IWorker>>(`/workers${suffix}`);
}
```

Des fonctions nues. Pas de hook, pas de JSX, pas de `useState`.

### 2. `api/worker.keys.ts` — les clés

```ts
export const workerKeys = {
  all: ['workers'] as const,
  lists: () => [...workerKeys.all, 'list'] as const,
  list: (params?: WorkerListParams) => [...workerKeys.lists(), params ?? {}] as const,
  details: () => [...workerKeys.all, 'detail'] as const,
  detail: (id: string) => [...workerKeys.details(), id] as const,
};
```

Copie la forme telle quelle. L'imbrication n'est pas décorative : React Query
compare les clés **par préfixe**, donc invalider `workerKeys.all` rafraîchit les
listes et les détails d'un coup.

### 3. `api/worker.queries.ts` — les hooks

```ts
'use client';

export function useWorkers(params?: WorkerListParams) {
  return useQuery({ queryKey: workerKeys.list(params), queryFn: () => fetchWorkers(params) });
}

export function useCreateWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createWorker,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workerKeys.all }),
  });
}
```

**L'invalidation appartient à la mutation.** C'est ce qui rend la règle 3 tenable :
tant qu'aucun autre chemin n'écrit, aucune liste ne peut rester périmée.

### 4. `model/worker-display.ts` — le sens

Les tons, les libellés dérivés, les règles métier d'affichage. Pas de React ici.

```ts
export const WORKER_STATUS_TONE: Record<WorkerStatus, Tone> = { … };
```

Rappel du partage : **le ton vit ici, le libellé vit dans `messages/*.json`.** Une
couleur est une décision de design, un mot est une traduction.

### 5. `ui/worker-list-page.tsx` — l'écran

Il porte les quatre états d'une liste distante — chargement, échec, vide, peuplé —
et délègue les lignes à un `WorkerTable`. Masque ce que le rôle ne peut pas faire :

```tsx
<Can permission={Permission.WORKER_MANAGE}>
  <Button variant="primary">{t('create')}</Button>
</Can>
```

### 6. `index.ts` — la porte

```ts
export { WorkerListPage } from './ui/worker-list-page';
export { useWorkers } from './api/worker.queries';
export { WORKER_STATUS_TONE } from './model/worker-display';
```

**Garde la liste courte.** Chaque export est une promesse : le renommer plus tard
casse des appelants que tu ne vois pas d'ici.

### 7. Déclarer la feature à ESLint

Dans `eslint.config.mjs`, ajoute `'workers'` au tableau `FEATURES`. Sans ça, le
cloisonnement ne s'applique pas au nouveau module.

### 8. La route

```tsx
// app/workers/page.tsx
import { RequireSession } from '@/features/auth';
import { WorkerListPage } from '@/features/workers';

export default function Page() {
  return <RequireSession><WorkerListPage /></RequireSession>;
}
```

---

## Séparer le calcul du rendu

Le critère, en une phrase :

> Un composant décide **où les choses sont et comment elles se lisent**. Tout ce
> qui décide **ce qui se passe** part dans un hook de `model/`.

### Les formulaires : toujours

Un formulaire coordonne des champs, un drapeau d'envoi, des erreurs et souvent une
redirection. C'est de l'état à coordonner par définition, donc le hook n'est pas
discutable.

```
model/use-login-form.ts       ← champs, envoi, échecs, redirection
ui/login-form.tsx             ← où sont les champs, comment ils se lisent
```

**Le hook renvoie des clés, jamais des phrases.**

```ts
setError(caught.status === 403 ? 'disabled' : 'invalidCredentials');
```

```tsx
{error && <Alert tone="danger">{t(error)}</Alert>}
```

Trois raisons, et la troisième est la vraie :

1. Le hook se teste sans fournisseur de traduction.
2. La formulation reste avec les autres formulations.
3. **Un message serveur en anglais ne peut plus atterrir sur un écran arabe.**
   L'ancien code affichait `caught.message` tel quel ; désormais ce qu'on ne sait
   pas traduire retombe sur une clé connue.

### Les listes : quand il y a un état

Tant que l'écran n'a qu'une requête et aucun état local, l'appeler depuis le
composant est plus lisible. Le hook arrive avec le **tri serveur, les filtres de
colonnes, la pagination ou la sélection multiple**.

`WorksiteListPage` s'en passe aujourd'hui — une requête, aucun état. Le premier
filtre justifiera `model/use-worksite-list.ts`.

cie-next extrait systématiquement un `useUserList` qui renvoie douze valeurs.
Extraire avant d'avoir un état, c'est déplacer six lignes derrière une indirection :
remplacer un composant fourre-tout par un hook fourre-tout ne change que l'endroit
du désordre.

### Ce qui reste légitimement dans le composant

Un sous-composant privé pour une portion de rendu — comme `ErrorList` dans
`invitation-form.tsx`. Il ne décide rien, il met en forme ; le sortir dans `model/`
serait une erreur de sens.

## Permissions

Adossées à `ROLE_PERMISSIONS` dans `@chantia/shared` — la même table que celle dont
l'API se sert pour refuser. Aucune requête n'est faite : le rôle voyage dans la
session, le reste est une constante.

```tsx
<Can permission={Permission.WORKSITE_MANAGE}>…</Can>   // masque
const showsBudget = usePermission(Permission.BUDGET_READ);  // conditionne
```

Sémantique **all-of** quand on passe une liste, comme `roleHasEveryPermission` côté
API. Deux endroits qui répondent différemment à la même question, c'est ainsi qu'une
interface se met à contredire son backend.

**Ce n'est pas une frontière de sécurité.** Tout ce qui est masqué reste atteignable
à la main ; c'est l'API qui refuse. Ça évite d'offrir des boutons qui répondront 403.

## Données : client, pas RSC

Tout le chargement passe par React Query côté client. Les Server Components restent
au squelette : layout, métadonnées, textes statiques.

La raison est le modèle de jeton. L'access token vit en mémoire du navigateur, le
refresh dans un cookie httpOnly. Un Server Component *pourrait* rafraîchir et
appeler l'API côté serveur — mais on aurait alors deux chemins de lecture, et c'est
exactement le défaut qu'on reproche à cie-next côté écriture. Un seul chemin,
cohérent.

Basculer une page précise vers RSC reste possible si un temps de chargement le
justifie. Par mesure, pas par principe.

## i18n

Les messages restent centralisés dans `messages/fr.json` et `ar.json`, avec un
namespace par feature (`worksites.*`, `login.*`).

cie-next met un `i18n/fr.json` par module. C'est cohérent avec l'isolation, mais ça
oblige un traducteur à ouvrir six fichiers. À deux langues et cinq domaines — avec
de l'arabe à faire relire d'un bloc — le coût de l'éclatement dépasse le bénéfice.
Voir `docs/12-internationalisation.md`.
