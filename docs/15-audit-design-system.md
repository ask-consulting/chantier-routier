# 15 — Audit du design system

> Relecture du 1ᵉʳ septembre 2026, du point de vue d'un système Tailwind : les
> jetons, leur contraste mesuré, la façon dont les composants les consomment, et
> ce qui manque pour les écrans du sprint suivant.
>
> Complète [`11-design-system.md`](11-design-system.md), qui décrit le système
> tel qu'il est *voulu*. Ce document dit ce qu'il *fait*, chiffres à l'appui, et
> ce que je changerais en premier.

## 0. Verdict

L'architecture est juste et rare : deux couches de jetons, une règle unique
(aucune valeur brute hors de `globals.css`) — et **elle est réellement tenue**.
Zéro `bg-blue-600`, zéro `#hex`, zéro valeur arbitraire `[…]` dans les 28
fichiers `.tsx` hors `shared/brand/`. Le bilinguisme est traité à la racine (`dir` sur
`<html>`, aucune classe directionnelle physique dans tout le code), ce qui est
le piège n°1 d'un produit fr/ar et il est évité.

Les défauts sont ailleurs, et ils sont de deux natures :

1. **Le thème sombre échoue le contraste sur ses deux boutons pleins.** Blanc
   sur `--primary` = **3,68:1**, blanc sur `--danger` = **2,77:1** (minimum AA
   4,5). Le correctif tient en une ligne.
2. **Rien ne vérifie tout ça.** La page `/design-system` est une belle référence
   vivante, mais aucun test ne la rend et aucun test ne mesure un contraste. Le
   système est bon parce que quelqu'un fait attention, pas parce que quelque
   chose l'empêche de dériver.

## 1. Ce qui est déjà juste — à ne pas casser

| | |
|---|---|
| Deux couches de jetons | palette brute → sémantique, `@theme inline` pour que la classe suive le thème |
| Discipline tenue | 0 couleur brute, 0 hex, 0 valeur arbitraire hors `shared/brand/` |
| Thème sombre | script bloquant avant le premier paint, préférence « système » distincte d'un choix explicite, `color-scheme` posé |
| RTL | `dir` sur `<html>`, aucune classe `ml-/pl-/text-left`, police arabe chargée seulement en `ar` |
| Focus | un seul `:focus-visible`, jamais retiré, `outline` (pas `ring`) donc insensible aux `overflow` d'un parent |
| Mouvement | `prefers-reduced-motion` respecté dans la couche de base |
| Formulaires | `Field` câble `htmlFor`, `aria-describedby`, `aria-invalid` en un seul endroit |
| Couleur jamais seule | pastille = point coloré **et** libellé |

## 2. Contraste — les mesures

Calculs WCAG 2.1 sur les valeurs de `globals.css`. Seuils : **4,5:1** pour du
texte < 18,66px, **3:1** pour la frontière d'un composant (1.4.11) et pour
l'anneau de focus.

### 2.1 Thème sombre — les boutons pleins ⚠️ à corriger

| paire | mesuré | seuil | |
|---|---|---|---|
| `fg-on-accent` sur `primary` (bouton principal) | **3,68** | 4,5 | ❌ |
| `fg-on-accent` sur `primary-hover` (au survol) | **2,54** | 4,5 | ❌ |
| `fg-on-accent` sur `danger` (bouton destructif) | **2,77** | 4,5 | ❌ |
| `fg-on-accent` sur `danger-hover` | **1,90** | 4,5 | ❌ |

La cause est un jeton qui fait deux métiers. En sombre, `--primary` a été
éclairci (`blue-500`) pour rester lisible **en tant que texte** sur un fond
sombre — le commentaire de `globals.css` le dit, et c'est le bon réflexe. Mais
le même jeton sert de **fond** sous du texte blanc, et là c'est l'inverse qu'il
faudrait. Le survol aggrave : il éclaircit encore, donc il dégrade encore.

**Le correctif : le texte sur accent n'est pas blanc dans les deux thèmes.**

```css
/* [data-theme='dark'] */
--fg-on-accent: var(--slate-950);   /* au lieu de var(--white) */
```

| après correction | mesuré | |
|---|---|---|
| `slate-950` sur `primary` (`blue-500`) | **5,48** | ✅ |
| `slate-950` sur `primary-hover` (`blue-400`) | **7,93** | ✅ |
| `slate-950` sur `danger` (`red-400`) | **7,29** | ✅ |
| `slate-950` sur `danger-hover` (`red-300`) | **10,63** | ✅ |

L'autre issue — garder le texte blanc et **assombrir le fond** (`blue-600`) —
est un piège : le bouton passerait à 2,79:1 **contre la page**, sous le seuil de
3:1 de 1.4.11. Le bouton deviendrait conforme sur son texte et invisible dans
son cadre. Un fond clair avec un libellé sombre est la seule option qui tienne
les deux contraintes à la fois.

### 2.2 Les gris secondaires et les bordures

| paire | thème | mesuré | seuil | |
|---|---|---|---|---|
| `fg-subtle` sur `surface-raised` — placeholders, indices, unités | clair | **2,56** | 4,5 | ❌ |
| `fg-subtle` sur `surface` | sombre | **3,93** | 4,5 | ❌ |
| `fg-muted` sur `surface-muted` — en-têtes de table, 11px | clair | **4,34** | 4,5 | ❌ (limite) |
| `border-strong` sur `surface-raised` — bordure d'`input` | clair | **1,48** | 3,0 | ❌ |
| `border-strong` sur `surface-raised` — bordure d'`input` | sombre | **1,72** | 3,0 | ❌ |
| `border` sur `surface-raised` — bordure de carte | les deux | 1,2 | 3,0 | ⚠️ toléré |

Trois remarques, parce que tout n'a pas le même poids :

- **Le placeholder est du texte**, et il porte souvent la seule indication de
  format (`JJ/MM/AAAA`). À 2,56 il est décoratif. Décalage d'un cran :
  `--fg-muted` → `slate-600` (7,58) et `--fg-subtle` → `slate-500` (4,76) en
  clair ; `--fg-subtle` → `slate-400` (7,30) en sombre. La hiérarchie à deux
  niveaux est conservée, les deux passent.
- **La bordure d'un `input` est la seule chose qui dit où commence le champ** —
  le fond du champ et celui de la page sont à 1,06 l'un de l'autre. C'est
  exactement le cas que 1.4.11 vise. Un jeton dédié `--border-input`
  (`slate-500` en clair = 4,76 ; `slate-500` en sombre = 3,75) règle la
  question sans alourdir les bordures de cartes.
- **La bordure de carte à 1,2 est acceptable** et je ne la toucherais pas : la
  carte est aussi identifiée par son changement de surface et son ombre, la
  bordure n'est pas le seul canal. C'est un choix, il mérite juste d'être écrit
  ici plutôt que redécouvert à chaque relecture.

### 2.3 Ce qui passe, et qu'il faut laisser tranquille

Les cinq tons en version *subtle* (fond pâle + texte assorti) sont solides dans
les deux thèmes : de 4,84 (signal clair) à 12,09 (primary sombre). L'anneau de
focus est à 3,52 en clair et 7,36 en sombre. Le jaune signal en aplat est à
2,03 sur blanc — c'est en dessous de 3, mais il ne sert que de **point** à côté
d'un libellé qui dit la même chose, et pour le logo. Conforme, parce que la
couleur n'y est jamais le seul canal.

## 3. `cn()` — l'ordre des classes ne décide pas du gagnant

`cn()` refuse `tailwind-merge` avec cet argument : « les composants prennent un
`className` ajouté en dernier, et l'ordre source CSS tranche ». La deuxième
moitié est vraie et c'est précisément le problème : **c'est l'ordre dans la
feuille générée qui tranche, pas l'ordre dans l'attribut**.

Mesuré dans le CSS réellement produit par ce projet
(`.next/static/css/app/layout.css`, positions en octets) :

| classe | position | conséquence |
|---|---|---|
| `.h-8` | 8 237 | `<Button size="md" className="h-8">` → **`h-10` gagne**, l'override est ignoré |
| `.h-10` | 8 288 | |
| `.p-4` | 13 047 | `<Button className="p-4">` → **`px-3` gagne** sur l'axe horizontal |
| `.px-3` | 13 224 | |
| `.bg-primary` | 12 280 | `<Button variant="primary" className="bg-surface-muted">` → l'override **fonctionne** |
| `.bg-surface-muted` | 12 724 | |

Trois overrides, deux ignorés, un qui marche — sans rien qui distingue les trois
au moment de les écrire. Le jour où quelqu'un ajuste une hauteur depuis un
appelant, il ne verra pas que rien ne s'est passé.

Deux sorties, et je prends la première :

1. **Écrire la règle et la faire tenir** : `className` sert à *ajouter* (marge,
   largeur, `col-span`), jamais à *remplacer* une propriété que la variante
   possède déjà. Ce qui doit varier devient une prop. C'est cohérent avec le
   reste du projet, et ça coûte 0 ko.
2. `tailwind-merge` (~8 ko) si les overrides deviennent courants — mais ce
   serait la conséquence d'une API de composants trop pauvre, pas la cause.

## 4. Ce que rien ne surveille

- **Aucun test ne touche `shared/ui/`.** Les trois specs du front couvrent
  `model/`. La page `/design-system` est une excellente référence, mais il faut
  qu'un humain l'ouvre, dans les deux thèmes, pour qu'elle serve.
- **Aucun test ne mesure un contraste.** Les quatre échecs du §2.1 sont dans
  `develop` depuis l'arrivée du thème sombre et n'ont rien déclenché.
- **`/design-system` est en ligne en production.** La route n'a pas de
  `RequireSession` et il n'y a pas de `middleware.ts` : le catalogue interne est
  publiquement navigable sur l'URL Vercel, et il embarque son JS dans le build.
- **`docs/11` §7 annonce `src/components/ui/`**, chemin qui n'existe plus depuis
  la bascule en architecture par features (`docs/13`) : c'est
  `src/shared/ui/`. Une doc de composants qui donne un mauvais chemin est la
  première chose qu'un nouvel arrivant essaie.

Le remède le moins cher, et de loin : **un test qui calcule les contrastes des
paires du §2 et échoue en CI**. Les jetons sont dans un seul fichier, les
formules WCAG tiennent en dix lignes, et cela transforme une vigilance en
cliquet — exactement ce que `docs/14` §2.3 fait déjà pour la couverture.

## 5. Ce qui manque, dans l'ordre où la roadmap le réclame

`docs/11` §13 liste déjà les composants absents. Ce qui suit les ordonne par ce
que le sprint suivant exige, pas par ordre alphabétique.

| lot | composants | ce qui le rend urgent |
|---|---|---|
| **1** | `Select`, `Textarea`, `Checkbox`, champ date | Sprint 1-2 (dépenses) : type, montant, date, fournisseur. Sans eux, chaque formulaire réinvente son `<select>` nu, et c'est là que les jetons fuient |
| **2** | `Dialog`, `Toast` | Confirmer une suppression, dire qu'un enregistrement a réussi. Les jetons `surface-overlay` et `shadow-overlay` existent déjà et ne servent à **rien** aujourd'hui (0 usage) — le premier `Dialog` doit les consommer, sinon ils meurent |
| **3** | `Menu` (dropdown), `Pagination`, `Tabs` | `UserMenu` est aujourd'hui trois éléments alignés ; il deviendra un menu. La table chantiers atteindra la pagination avant le pilote |
| **4** | palette de visualisation | Sprint 5-6 (dashboard). Les cinq tons ne suffisent pas : une série de graphique demande des couleurs *distinguables entre elles*, ce qui est un autre problème que *lisibles sur un fond* |

Deux détails à traiter dans le lot 1, tant qu'on est dans `Button` :

- **Pas de taille « icône seule ».** `UserMenu` rend un bouton carré avec le
  padding horizontal d'un bouton à libellé (`px-3`). Une taille `icon`
  (`size-8` / `size-10`, sans `px`) évite que chaque appelant bricole.
- **Pas d'état `loading`.** Chaque formulaire gère son `disabled` à la main ;
  un `loading` qui pose `disabled` **et** `aria-busy` est trois lignes ici et
  zéro ligne partout ailleurs.

## 6. Deux points mineurs, notés pour ne pas les redécouvrir

- **Le thème sombre dépend de JavaScript.** `@custom-variant dark` est lié à
  `[data-theme]`, posé par le script d'init. JS coupé → toujours clair, même si
  l'OS est en sombre. Une requête `@media (prefers-color-scheme: dark)` en
  secours, appliquée seulement en l'absence de `[data-theme]`, coûte un bloc.
- **Anneau de focus dans une table qui défile.** `Table` scrolle
  horizontalement (`overflow-x-auto`) ; le jour où une ligne devient cliquable,
  un `outline-offset: 2px` sur un élément en bord de zone sera rogné. À
  vérifier à ce moment-là, pas avant.

## 7. Ce que cet audit n'a pas fait

Les contrastes sont calculés sur les **jetons**, pas sur des captures : une
opacité (`border-primary/20`) ou une superposition change le résultat réel. Rien
n'a été testé avec un vrai lecteur d'écran, ni sur un téléphone au soleil — ce
qui est pourtant le contexte d'usage du produit, et où le jaune signal et les
cibles tactiles se jugent vraiment. Aucun composant n'a été rendu dans un
navigateur pour cet audit : la lecture est statique, sur le code et le CSS
généré.

## 8. Si je ne devais faire qu'une chose

Le §2.1 : une ligne de CSS, quatre échecs de contraste réparés, sur les deux
boutons que tout le monde clique. Puis le test de contraste du §4, pour que la
ligne suivante ne les réintroduise pas.
