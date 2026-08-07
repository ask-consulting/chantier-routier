# 11 — Design system

> Les jetons et les composants du front (`apps/web`), en Tailwind CSS v4.
> La référence vivante est la page **`/design-system`** : elle rend chaque jeton et
> chaque composant, dans les deux thèmes. Un contraste cassé s'y voit tout de suite.

## 1. Deux couches, et une seule règle

```
palette brute        --blue-600, --slate-200, --yellow-500…    la peinture disponible
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
| `signal` | ce qui demande attention : chantier suspendu, budget serré | `#f5a623` | `#fbbf24` |
| `success` | ce qui est abouti : chantier terminé, dans le budget | `#15803d` | `#4ade80` |
| `danger` | ce qui est cassé ou irréversible : erreur, suppression | `#b91c1c` | `#f87171` |

Les couleurs sont **éclaircies en thème sombre** : `#1d4ed8` sur fond foncé
n'atteint pas le contraste et rend boueux.

**Le jaune est rare, et c'est le sujet.** Une couleur de signal utilisée partout
ne signale plus rien.

Il a fallu deux essais pour le trouver, et les deux échecs valent d'être notés :
`#d97706` (ambre) rend brun à côté du bleu, `#ea580c` (orange) tire vers le rouge
et empiète sur le danger. La couleur du métier — casque, barrière, gyrophare — est
plus **claire** que les deux.

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

Tous dans `src/components/ui/`, tous exposent `className` en dernier pour qu'un
appelant puisse ajuster sans forker. Référence vivante avec extraits copiables :
**`/design-system`**.

### `Button`

```tsx
<Button variant="primary">Enregistrer</Button>   // un seul par vue
<Button variant="secondary">Annuler</Button>     // le défaut
<Button variant="ghost">Filtrer</Button>         // action discrète
<Button variant="danger">Supprimer</Button>      // irréversible
<Button size="sm" />                             // 32 px au lieu de 40
```

`type="button"` par défaut, et c'est important : sans ça, un bouton dans un
formulaire le soumet, ce qui transforme « Annuler » en « Enregistrer » à la
première touche Entrée. Mettre `type="submit"` explicitement quand c'est voulu.

**Un seul bouton primaire par vue.** C'est ainsi que l'œil trouve l'action
principale ; deux primaires et il n'en trouve aucune.

### `Badge`

```tsx
const status = WORKSITE_STATUS[worksite.status];
<Badge tone={status.tone} dot>{status.label}</Badge>
```

Le ton vient **toujours** d'une table de `domain-display.ts`, jamais écrit en dur
à l'appel : une couleur de statut se change alors à un seul endroit.

`dot` ajoute une pastille pleine — la couleur n'est jamais le seul canal.

### `Alert`

```tsx
<Alert tone="danger">Impossible de charger les chantiers.</Alert>
<Alert tone="signal">Ce chantier dépasse 90 % de son budget.</Alert>
```

`danger` et `signal` portent `role="alert"` : annoncés sans attendre le focus.
Les autres tons sont `role="status"`.

C'est un message **de la vue**, pas un toast : il reste tant que la situation
qu'il décrit dure.

### `Field`

```tsx
<Field label="Code chantier" placeholder="RN7-2026" hint="Unique dans l'organisation." />
<Field label="Mot de passe" type="password" error={errors.password} />
```

L'étiquette liée, `aria-invalid` et `aria-describedby` sont câblés par le
composant — personne ne s'en souvient au vingtième formulaire. L'erreur remplace
l'aide.

L'API renvoie **toutes** les violations d'un coup (cf. `08-identity-module.md`
§7), donc un mot de passe refusé pour quatre raisons les affiche toutes.

### `Card`

```tsx
<Card>
  <CardHeader>
    <CardTitle>Coûts du chantier</CardTitle>
    <Button variant="ghost" size="sm">Exporter</Button>
  </CardHeader>
  <CardBody>…</CardBody>
</Card>
```

`CardHeader` écarte son contenu aux deux extrémités : titre à gauche, action à
droite, sans classe supplémentaire.

### `Table`

```tsx
<Table>
  <THead><tr><TH>Nom</TH><TH numeric>Budget</TH></tr></THead>
  <tbody>
    {rows.map((row) => (
      <TRow key={row.id}>
        <TD className="font-medium">{row.name}</TD>
        <TD numeric>{formatAmount(row.budget)}</TD>
      </TRow>
    ))}
  </tbody>
</Table>
```

`numeric` aligne à droite en **chiffres tabulaires** : les chiffres se rangent en
colonnes et deux montants se comparent d'un coup d'œil.

Le tableau **défile horizontalement tout seul**, pour que la page ne le fasse
jamais : une colonne de budget poussée hors écran ne doit pas emporter la
navigation avec elle.

### `Skeleton` et `EmptyState`

```tsx
{isPending && <Skeleton className="h-12" />}

<EmptyState
  title="Aucun pointage cette semaine"
  description="Les pointages saisis sur le terrain apparaîtront ici."
  action={<Button variant="secondary">Saisir un pointage</Button>}
/>
```

`Skeleton` à la **hauteur finale** de ce qu'il remplace : préféré à un rotateur
parce que rien ne saute quand les données arrivent.

`EmptyState` prend **toujours** une action : un état vide sans issue est un
cul-de-sac.

### `Snippet`

Bloc de code pour les pages du design system. Défile dans sa propre boîte, même
règle que `Table`.

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

## 10. La marque

Deux objets, deux métiers. C'est la distinction qui compte.

| | Fichier | Où |
|---|---|---|
| **Logo** | `components/brand/logo.tsx` | en-tête, favicon, documents |
| **Illustration** | `components/brand/illustration.tsx` | connexion, erreurs, états vides |

Le logo doit survivre à 16 px, à une seule couleur et à un onglet de navigateur.
L'illustration n'a qu'à être accueillante — elle peut se permettre tout le détail
que la marque a dû abandonner. Raster assumé : rien chez elle n'a besoin de
devenir un favicon.

### Utilisation

```tsx
import { Logo, LogoMark, BrandIllustration } from '@/components/brand';

<Logo />                      // en-tête : symbole + « Chantia »
<Logo size={40} />
<Logo markOnly />             // symbole seul, barre latérale repliée

<LogoMark size={24} />
<LogoMark size={40} mono />   // une couleur, prend celle du texte
<LogoMark title="" />         // décoratif, si un libellé visible dit déjà « Chantia »

<BrandIllustration size={240} />          // page de connexion
<BrandIllustration size={160} className="mx-auto" />  // erreur, état vide
```

### Les règles

- **Jamais les deux dans la même vue.** Logo et illustration ensemble se lisent
  comme deux produits.
- **Ne pas recolorer la marque.** Elle a ses propres jetons — `--brand-ring`
  (#2c3e50) et `--brand-shell` (#ffc627) — et garde ses couleurs **dans les deux
  thèmes**, contrairement au reste de l'interface. C'est délibéré : `--signal` a
  changé deux fois pendant la conception, la marque n'a pas bougé.
- **Ne pas redessiner le symbole.** L'anneau est calculé à partir de six
  constantes en tête de `logo.tsx` (`TEETH`, `R_TIP`, `R_ROOT`, `R_HOLE`, `CX`,
  `CY`). Changer le nombre de dents, c'est un chiffre — pas un nouveau chemin.
- **`title=""` quand un libellé visible existe**, sinon un lecteur d'écran
  annonce « Chantia » deux fois. `Logo` le fait déjà.

### Comment il a été fabriqué

L'anneau est **généré**, le casque vient du dessin d'origine. Un tracé
automatique suit un contour pixel par pixel : les douze dents sortaient toutes
légèrement différentes et le cercle de fond n'en était pas un — invisible à
400 px, très visible dans un en-tête. Les proportions sont celles mesurées sur le
dessin, seule la régularité change. Les coins sont adoucis en contournant la
forme avec sa propre couleur (`stroke-linejoin: round`) : une ligne au lieu de
quarante congés calculés, et les dents s'épaississent un peu au passage.

Le casque est conservé tel quel. Un piège à connaître : **un tracé décrit
l'encre, pas l'objet**. Remplir ce chemin colore les contours et laisse la coque
vide — le corps est donc peint depuis le sous-chemin extérieur, et les traits du
dessin reposés par-dessus.

Le tracé source est archivé dans `docs/brand/source-logo-trace.svg`.

Sous 24 px les dents se referment en un disque. Accepté : la marque reste
reconnaissable à sa couleur et à son casque.

Référence vivante : **`/design-system/brand`**.

## 11. Reste à faire

- Composants de saisie au-delà de `Field` : `Select`, `Textarea`, `Checkbox`.
- Navigation : barre latérale, fil d'Ariane, onglets.
- `Dialog` et `Toast` (jetons `surface-overlay` et `shadow-overlay` déjà en place).
- Graphiques budget / coûts — palette de visualisation à définir, elle ne se
  déduit pas des cinq tons.
- La table `USER_ROLE` rejoint `domain-display.ts` quand l'authentification arrive
  dans `develop` : `UserRole` vit dans `@chantia/shared` sur la ligne
  `release/auth`.
- Page de connexion et pages d'erreur, qui utiliseront `BrandIllustration`.
