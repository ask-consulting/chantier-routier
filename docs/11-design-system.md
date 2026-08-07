# 11 — Design system

> Les jetons et les composants du front (`apps/web`), en Tailwind CSS v4.
> La référence vivante est la page **`/design-system`** : elle rend chaque jeton et
> chaque composant, dans les deux thèmes. Un contraste cassé s'y voit tout de suite.

## 1. Deux couches, et une seule règle

```
palette brute        --blue-600, --slate-200, --amber-600…     la peinture disponible
        ↓
jetons sémantiques   --primary, --surface-raised, --fg-muted…  ce à quoi elle sert
        ↓
composants           bg-primary, text-fg-muted, border-border
```

**Règle unique : aucune valeur de palette brute hors de `globals.css`.**

Un composant qui écrit `bg-primary` survit à un changement de couleur de marque ;
un composant qui écrit `bg-blue-600` doit être retrouvé et réécrit. C'est aussi ce
qui fait fonctionner le mode sombre sans une seule variante `dark:` dans les
composants — les jetons changent, les classes non.

## 2. Les couleurs

| Rôle | Usage | Clair | Sombre |
|---|---|---|---|
| `primary` | tout ce qui est interactif : boutons, liens, sélection | `#1d4ed8` | `#3b82f6` |
| `signal` | ce qui demande attention : chantier suspendu, budget serré | `#d97706` | `#fbbf24` |
| `success` | ce qui est abouti : chantier terminé, dans le budget | `#15803d` | `#4ade80` |
| `danger` | ce qui est cassé ou irréversible : erreur, suppression | `#b91c1c` | `#f87171` |

Les couleurs sont **éclaircies en thème sombre** : `#1d4ed8` sur fond foncé
n'atteint pas le contraste et rend boueux.

**L'ambre est rare, et c'est le sujet.** Une couleur de signal utilisée partout ne
signale plus rien. Si tout devient ambre, plus rien n'attire l'œil.

### Surfaces

`surface-sunken` → `surface` → `surface-raised` → `surface-overlay`, du fond vers
le lecteur. En thème sombre elles s'**éclaircissent** en avançant, l'inverse du
thème clair : l'élévation se lit par le contraste avec la page, pas par une
direction fixe.

### Les cinq tons

Un composant demande un **ton**, jamais une couleur :

| Ton | Sens |
|---|---|
| `neutral` | information sans charge |
| `info` | en cours, normal |
| `signal` | demande attention |
| `success` | abouti, favorable |
| `danger` | erreur, dépassement |

Cinq, jamais plus. Au-delà, personne ne retient ce que la sixième veut dire.

## 3. Espacement

L'échelle Tailwind (pas de 4 px) reste disponible **à l'intérieur** d'un composant.
Pour la **mise en page**, quatre pas nommés, pour que la décision soit prise une
fois :

| Jeton | Valeur | Usage |
|---|---|---|
| `gutter` | 24 px | marges latérales de page |
| `gutter-lg` | 32 px | idem, au-delà de 1024 px |
| `section` | 32 px | entre deux blocs d'une page |
| `stack` | 16 px | entre frères dans un bloc |

`max-w-content` (1280 px) borne la largeur : au-delà, l'œil perd la ligne en
revenant à gauche d'un tableau.

Deux rayons seulement : `rounded-control` (boutons, champs, pastilles) et
`rounded-surface` (cartes, tableaux, dialogues).

## 4. Le thème sombre

Piloté par `data-theme` sur `<html>`, écrit par `ThemeProvider`. Trois états —
clair, sombre, système — parce que « suivre le système » est un choix distinct
qu'une bascule à deux positions ne sait pas exprimer.

`@custom-variant dark` redéfinit la variante `dark:` de Tailwind, qui suit
`prefers-color-scheme` par défaut, pour qu'elle obéisse à l'attribut. En pratique
aucun composant n'en a besoin : les jetons suffisent.

**Pas de clignotement au chargement.** Un script bloquant dans le `<head>` applique
le thème stocké avant le premier rendu. Tout ce qui est asynchrone — un
`useEffect` compris — s'exécute après la première peinture, et une page blanche
qui vire au sombre est précisément ce qu'on évite. C'est aussi pourquoi `<html>`
porte `suppressHydrationWarning` : ce script écrit l'attribut avant que React ne
regarde.

## 5. Le domaine

`src/lib/domain-display.ts` traduit les énumérations métier en libellé français et
en ton. Une seule table par énumération, un seul fichier.

Deux choix qui méritent d'être dits :

- **« En cours » est `info`, pas `success`.** Un chantier en cours est l'état
  normal, pas une réussite. Garder le vert pour « terminé » est ce qui donne un
  sens au vert.
- **« Suspendu » est `signal`, pas `danger`.** Ça demande attention, ce n'est pas
  une avarie. Le rouge reste pour l'irréversible.

L'API parle anglais (cf. `06-api-conventions-ddd-cqrs.md`), la traduction vers le
français vit ici, au bord.

## 6. Accessibilité

- **La couleur n'est jamais le seul canal.** Une pastille porte un point coloré
  *et* un libellé. Environ 8 % des hommes ne distinguent pas le rouge du vert.
- **L'anneau de focus n'est jamais retiré.** C'est toute la navigation de
  l'application pour qui n'utilise pas de souris. Un seul style, partout,
  `:focus-visible` donc invisible à la souris.
- **`prefers-reduced-motion` est respecté** dans la couche de base.
- Les erreurs de formulaire posent `aria-invalid` et sont liées par
  `aria-describedby` — le composant `Field` s'en charge, pour qu'on ne l'oublie
  pas au vingtième formulaire.

## 7. Les composants

| Composant | Notes |
|---|---|
| `Button` | `primary` / `secondary` / `ghost` / `danger`. **Un seul primaire par vue.** `type="button"` par défaut : sans ça, un bouton dans un formulaire le soumet. |
| `Badge` | pastille de ton, avec point optionnel |
| `Card` | + `CardHeader`, `CardTitle`, `CardBody` |
| `Alert` | message en ligne, `role="alert"` sur `danger` et `signal` |
| `Field` | champ étiqueté, câblé pour l'accessibilité |
| `Table` | + `THead`, `TH`, `TRow`, `TD`. Défile horizontalement tout seul, pour que la page ne le fasse pas. `numeric` aligne à droite en chiffres tabulaires. |
| `Skeleton` | garde la mise en page à sa taille finale, contrairement à un spinner |
| `EmptyState` | avec une action : un état vide sans issue est un cul-de-sac |

## 8. Pièges rencontrés

**Les classes construites dynamiquement ne produisent rien.** Tailwind lit le
source à la recherche de noms de classes entiers ; `` `bg-${name}` `` ne génère
aucun CSS. Il faut écrire les noms en toutes lettres, quitte à passer par une
table.

**`@theme inline` et pas `@theme`.** Sans `inline`, l'utilitaire généré fige la
valeur du jour au lieu de référencer `var(--surface)` — et une seule classe ne
peut plus suivre les deux thèmes.

**Pas de `tailwind-merge`.** Cette bibliothèque résout des *conflits* entre
classes, ce dont on n'a besoin que si un composant concatène des jeux qui se
chevauchent. Ici `className` est ajouté en dernier et l'ordre CSS tranche : la
dépendance n'apporterait rien.

## 9. Ajouter un composant

1. Y a-t-il un jeton pour ce dont j'ai besoin ? Sinon, l'ajouter à `globals.css` —
   **jamais** une valeur brute dans le composant.
2. Écrire le composant dans `src/components/ui/`, exposer `className` en dernier.
3. L'ajouter à `/design-system`, dans les deux thèmes.
4. Vérifier au clavier : le focus est-il visible et l'ordre logique ?
5. `pnpm --filter @chantia/web build` — c'est là que les classes dynamiques se
   trahissent.

## 10. Reste à faire

- Composants de saisie au-delà de `Field` : `Select`, `Textarea`, `Checkbox`.
- Navigation : barre latérale, fil d'Ariane, onglets.
- `Dialog` et `Toast` (jetons `surface-overlay` et `shadow-overlay` déjà en place).
- Graphiques budget / coûts — palette de visualisation à définir, elle ne se
  déduit pas des cinq tons.
- La table `USER_ROLE` rejoint `domain-display.ts` quand l'authentification arrive
  dans `develop` : `UserRole` vit dans `@chantia/shared` sur la ligne
  `release/auth`.
