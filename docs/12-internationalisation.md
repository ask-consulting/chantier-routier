# 12 — Internationalisation

> Le front parle **français** et **arabe**. L'arabe n'est pas qu'une traduction :
> c'est un renversement de la direction de lecture, et c'est là que se trouve le
> vrai travail.

## 1. Ce qu'on a choisi, et ce que ça coûte

| Décision | Conséquence assumée |
|---|---|
| **Pas de préfixe d'URL** — `/chantiers` dans les deux langues, langue en cookie | URLs courtes et stables, mais **impossible d'envoyer un lien en arabe** à un collègue : il s'ouvrira dans *sa* langue |
| **Chiffres latins en arabe** (`250 000 €`) | Un tableau de coûts reste lisible par un conducteur de travaux francophone et par un chef de chantier arabophone |
| **Police arabe chargée** (IBM Plex Sans Arabic) | ~40 Ko, **uniquement quand la page est en arabe** |
| Pages `/design-system` **non traduites** | Outil interne. Les traduire coûterait plus que ça ne rapporte |

Le choix du cookie se défend pour un back-office authentifié où personne n'arrive
par un lien externe. Il se défendrait mal pour un site public : là, le préfixe
`/fr` `/ar` serait obligatoire pour le référencement.

## 2. Comment ça marche

`next-intl` en mode **sans routage** — la variante moins connue, faite pour les
applications où la langue vient des préférences utilisateur et non de l'URL.

```
messages/fr.json          les traductions
messages/ar.json
src/i18n/config.ts        langues, direction, tag Intl
src/i18n/request.ts       lit le cookie côté serveur, charge le bon bundle
src/i18n/set-locale.ts    server action qui écrit le cookie
```

La langue est lue **côté serveur** pour choisir le bundle de messages. C'est
pourquoi le changement de langue passe par une *server action* et non par une
écriture de cookie côté navigateur : il faut que la valeur soit posée **avant** le
rendu suivant, sinon la page reste dans l'ancienne langue jusqu'au prochain
rafraîchissement.

Le cookie est **validé, pas cru** : c'est une valeur contrôlée par l'utilisateur,
et elle finit dans un chemin d'`import()` dynamique.

## 3. Le RTL

```tsx
<html lang={locale} dir={directionOf(locale)}>
```

`dir` sur `<html>` est ce qui **retourne réellement** l'interface : toutes les
propriétés logiques de la feuille de style se résolvent contre lui. Poser `lang`
sans `dir` donnerait du texte arabe dans une mise en page de gauche à droite.

### Propriétés logiques, pas directionnelles

| À ne plus écrire | À écrire |
|---|---|
| `ml-` `mr-` | `ms-` `me-` |
| `pl-` `pr-` | `ps-` `pe-` |
| `text-left` `text-right` | `text-start` `text-end` |
| `border-l` `border-r` | `border-s` `border-e` |
| `left-` `right-` | `start-` `end-` |

L'audit avant migration n'a trouvé que **quatre** classes directionnelles dans
tout le front — parce que le design system est bâti sur `flex` et `gap` plutôt que
sur des marges. C'est un bénéfice qu'on n'avait pas cherché, mais il ne se
maintiendra que si la règle est suivie.

**Ce qui ne se retourne pas** : les nombres, les dates, le code, et le sens de
progression d'un graphique temporel. `tabular-nums` sur une colonne de montants
reste juste dans les deux sens.

## 4. Traductions et domaine

Le partage est net, et il compte :

- **Le ton** (couleur) vit dans `lib/domain-display.ts` — c'est une décision de
  design.
- **Le libellé** vit dans `messages/*.json` — c'est une traduction.

```tsx
const tStatus = useTranslations('worksiteStatus');

<Badge tone={WORKSITE_STATUS_TONE[worksite.status]} dot>
  {tStatus(worksite.status)}
</Badge>
```

Garder le libellé français dans `domain-display.ts` aurait créé un second endroit
à éditer à chaque nouvelle langue.

**Les clés d'énumération sont les valeurs de l'API** (`in_progress`,
`site_manager`), pas des noms inventés : une valeur ajoutée côté back se traduit
sans table de correspondance.

## 5. L'API était déjà prête

Elle renvoie des **clés d'internationalisation**, pas des phrases :

```json
{ "field": "password", "code": "form.errors.password.minLength", "message": "…" }
```

Le `code` correspond exactement à une entrée de `messages/*.json`. Le `message`
anglais reste un repli pour un client qui ne traduit pas. Aucun changement côté
API n'a été nécessaire.

## 6. Nombres et dates

```ts
formatAmount(250000, 'ar')  // « 250.000 € », chiffres latins
formatDate('2026-03-12', 'ar')
```

L'arabe se résout en `ar-MA-u-nu-latn`. À noter : `ar-MA` produit **déjà** des
chiffres latins — le Maroc les utilise par défaut dans CLDR — donc le
`-u-nu-latn` est une ceinture en plus des bretelles. Il est gardé parce qu'il rend
l'intention explicite, et parce qu'il protégerait si la langue passait un jour à
`ar-EG`, qui bascule en chiffres orientaux.

## 7. Ajouter une chaîne

1. La clé va dans **`messages/fr.json` et `messages/ar.json`** — les deux, jamais
   une seule. Une clé manquante rend le nom de la clé à l'écran.
2. Dans le composant : `const t = useTranslations('worksites')` puis `t('title')`.
3. Pour un pluriel, utiliser la syntaxe ICU. **L'arabe a six formes**
   (`zero`, `one`, `two`, `few`, `many`, `other`) contre deux en français : c'est
   le piège le plus courant.
4. Vérifier dans les deux langues avec le sélecteur de l'en-tête.

## 8. Reste à faire

- Traduire les pages de connexion et d'erreur quand elles existeront.
- Faire relire l'arabe par un locuteur natif : les traductions actuelles sont
  correctes mais n'ont pas été validées par quelqu'un du métier, et le vocabulaire
  des travaux publics a ses usages.
- Envisager `next-intl/plugin` en mode typé (`AppConfig`) pour que `t('clé')`
  échoue à la compilation quand la clé n'existe pas.
