# 14 — État des lieux et priorités

*Arrêté au 14 août 2026. Révisé les 17, 18, 20, 21 et 26 août 2026.*

## Le constat en une phrase

**Les fondations sont plus solides que le produit.** L'authentification, le
multi-tenant, les permissions, l'architecture front et le durcissement de l'API
tiendront des années — mais un chef de chantier ne peut toujours rien pointer,
et personne ne peut être invité sans copier-coller une URL à la main.

La priorité 1 est close, et vérifiée là où ça compte : sur la production, pas
dans le dépôt.

Ce document classe ce qui manque. L'ordre est une décision prise, pas une
suggestion : sécurité, puis qualité de code, puis observabilité, puis le mobile,
puis le module utilisateurs complet avec les notifications. Le métier vient après.

> **Révision du 26 août.** Aucune ligne n'avait été écrite depuis le 21 — et
> c'était précisément le constat. Il est clos le soir même : la priorité 0 que
> cette révision a ouverte a été tenue dans la journée (PR #22).
>
> **Le travail de sécurité du 21 août n'était pas en ligne.** Il tenait sur une
> branche locale, `feat/api-security-headers`, jamais poussée, sans PR ouverte.
> `develop` ne l'avait pas, `main` encore moins, et la production pas du tout.
> Mesuré sur la vraie production, pas déduit du dépôt :
>
> ```
> GET /health     200   content-type · vary · cf-cache-status · server: cloudflare
>                       aucun HSTS, aucun nosniff, aucune CSP, aucun Referrer-Policy
> GET /api        200   text/html          Swagger UI, sans authentification
> GET /api-json   200   19 682 octets      spécification OpenAPI complète
> ```
>
> `19 682` octets — au dernier octet près, le nombre que ce document citait le
> 21 août comme le problème à fermer. **Les trois sections marquées ✅ ce
> jour-là l'étaient à tort** : « fait » y voulait dire *écrit*, pas *livré*.
> Elles sont revenues à ✅ en fin de journée, cette fois pour la bonne raison —
> la production a été re-mesurée après la fusion, et rend la politique attendue
> (§0.1).
>
> La leçon change de nature. Les révisions des 17, 18, 20 et 21 août portaient
> toutes sur un **diagnostic faux** — une dépendance mal jugée, un `grep` pris
> pour une preuve. Celle-ci porte sur un **diagnostic juste, et un correctif qui
> n'atteint personne.** Un correctif non fusionné protège exactement autant
> qu'un correctif jamais écrit ; il coûte seulement plus cher, parce qu'il donne
> en prime le sentiment que c'est réglé. Un ✅ dans ce document ne vaut
> désormais que pour du code sur `develop`.
>
> D'où la **priorité 0** : livrer ce qui est déjà écrit, avant d'écrire autre
> chose. C'était la plus petite action du document, et la seule qui changeait
> l'état de la production. Elle est faite.
>
> **Un point neuf s'est ouvert en la faisant (§1.2 bis).** Le `git push` a fait
> répondre GitHub : neuf alertes de dépendances sur `develop`, là où §1.2
> déclare zéro depuis le 20 août et où `pnpm audit` rend toujours zéro. Après
> vérification, le verrou est propre et les neuf alertes sont périmées —
> Dependabot ne les a jamais réévaluées. §1.2 tient donc sur le fond, mais pas
> sur la méthode : « zéro alerte » y avait été mesuré au seul `pnpm audit`. Un
> outil ne donne pas l'état du dépôt, il donne son avis — c'est le `grep` des
> révisions précédentes, avec un instrument plus crédible.
>
> Le reste du dépôt est sain, revérifié plutôt que recopié : 93 tests verts
> (53 sur l'API, 40 sur le paquet partagé), `pnpm lint` et `pnpm typecheck`
> verts. Tous les points encore ouverts ci-dessous ont été reconfirmés un par un
> dans le code — aucun ne s'est fermé tout seul.
>
> **Révision du 21 août.** La priorité 1 est close, et là encore le document
> avait tort sur l'un des deux points — pour la deuxième révision d'affilée.
>
> **1.3 est clos.** `@fastify/helmet` est en place, avec une politique qui prend
> deux formes parce que ce service ne sert qu'une seule page HTML : Swagger, hors
> production. Le réglage vit dans un module à part et non dans `main.ts`, parce
> que toutes les pannes possibles ici sont silencieuses — un en-tête qui cesse
> d'être envoyé ressemble à un en-tête qui n'a jamais existé. Sept tests le
> fixent, vérifiés en cassant le code exprès.
>
> **1.4 disait l'inverse de la vérité.** « Aucun code n'importe `@fastify/static`,
> le retirer » — le retirer aurait **cassé Swagger en production**. Nest ne
> l'importe pas : il le charge par son nom au démarrage, par un `require()`
> dynamique qu'aucun `grep` ne voit. Et le vrai problème n'était pas l'inutilité
> mais un étau de versions dont l'intersection est vide : la seule version non
> vulnérable est hors de la plage que déclare `platform-fastify`. La sortie n'est
> pas une version, c'est de **ne plus servir Swagger hors développement** — ce qui
> a fermé au passage une exposition plus lourde que les deux points réunis : la
> spécification OpenAPI complète, publique et sans authentification (§1.4 bis).
>
> La leçon des trois dernières révisions est la même à chaque fois : **une
> dépendance ne se juge pas au `grep`.** Les peers ne se surchargent pas (§1.2),
> les chargements dynamiques ne se cherchent pas dans le texte (§1.4).
>
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

## Priorité 0 — Livrer ce qui est déjà écrit

Cette priorité n'existait pas avant le 26 août. Elle ne demande aucune ligne de
code : tout ce qu'elle recouvre est écrit, testé et vert. Il manque un `git push`
et une PR.

### 0.1 La branche de sécurité est fusionnée et en ligne ✅

Deux commits, sur une branche qui n'existe que sur cette machine :

```
44de0ef  feat(api): poser les en-têtes de sécurité et sortir Swagger de la production
894f992  docs: réviser l'état des lieux au 21 août
```

| | ce que contient la branche | ce que voit la production |
|---|---|---|
| en-têtes de protection | HSTS, `nosniff`, CSP, `Referrer-Policy`, CORP | aucun |
| Swagger UI (`/api`) | 404 hors développement | 200, `text/html`, sans authentification |
| spécification (`/api-json`) | 404 hors développement | 200, 19 682 octets |
| `@fastify/static` | hors du chemin d'exécution | chargé à chaque démarrage |
| tests | 7, sur la politique d'en-têtes | — (ils ne sont pas sur `develop` non plus) |

`develop` est donc toujours à 46 tests sur l'API, pas 53 : les sept tests qui
fixent la politique d'en-têtes sont sur la branche, avec le code qu'ils fixent.

*Fermé le 26 août, PR #22.* La branche a été poussée, fusionnée dans `develop`,
et Render a redéployé seul (`autoDeploy: true`). **Puis la production a été
re-mesurée** — l'étape qui manquait le 21 août, et la seule qui distingue
« écrit » de « livré » :

```
$ curl -D - https://chantia-api.onrender.com/health
HTTP/2 200
content-security-policy: default-src 'none';base-uri 'none';form-action 'none';frame-ancestors 'none'
strict-transport-security: max-age=31536000; includeSubDomains
x-content-type-options: nosniff
referrer-policy: no-referrer
cross-origin-resource-policy: same-origin
x-frame-options: DENY

GET /api        → 404
GET /api-json   → 404   71 octets
```

Conforme à la politique décrite en §1.3, au détail près : CSP `default-src
'none'` en production, HSTS à un an **sans `preload`**, COEP absent — les trois
décisions délibérées y sont visibles dans la réponse. Swagger et la
spécification ont disparu ; les 19 682 octets avec.

**Deux notes de méthode**, parce que la mesure elle-même a failli mentir dans
les deux sens :

- **La première requête est revenue vide.** Le plan gratuit de Render endort le
  service ; le réveil à froid dépasse le délai. Une mesure qui échoue ressemble
  à une mesure qui trouve zéro en-tête — exactement la panne silencieuse que
  §1.3 décrit à propos des en-têtes eux-mêmes. Il faut relancer, pas conclure.
- **Le chemin sortant de cette machine passe par un proxy TLS interceptant.**
  La réserve levée avant la fusion vaut toujours : un intermédiaire peut retirer
  des en-têtes. Ici il en ajoute — donc l'inquiétude ne porte plus. Les 404 sur
  `/api` et `/api-json`, eux, n'ont jamais dépendu du proxy.

### 0.2 `main` est 17 commits derrière `develop`

Les deux branches ont divergé et personne ne les a rapprochées. Ça n'a aucune
conséquence tant que `develop` est la branche déployée — mais c'est précisément
ce qui rend la question du §3.3 urgente : le jour où la production est promue
depuis `main`, ce retard devient la production elle-même.

**Action** — trancher §3.3 (quelle branche déploie quoi) avant que l'écart
grandisse, ou aligner `main` sur `develop` en attendant.

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
`nanoid`, `deepmerge-ts` — et `@fastify/cookie`, retiré parce que rien ne
l'importait *et* que rien ne le chargeait. La nuance a son importance : elle est
exactement ce qui distingue ce cas de `@fastify/static`, où la même conclusion
était fausse (§1.4).

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

### 1.2 bis — Dependabot et `pnpm audit` ne mesurent pas la même chose ⚠️

*Trouvé le 26 août, en poussant la branche.* GitHub a répondu au `git push` :

```
GitHub found 9 vulnerabilities on the default branch (8 high, 1 moderate)
```

La branche par défaut est `develop` — pas `main`. Donc GitHub annonce neuf
alertes là où §1.2 déclare « zéro partout » depuis le 20 août, et où
`pnpm audit` rend toujours zéro aujourd'hui. **Les deux outils se contredisent
sur la même branche.**

Ce sont exactement les six paquets que §1.2 dit avoir corrigés. Plages
vulnérables confrontées aux versions **réellement résolues dans le verrou** :

| paquet | vulnérable | résolu | |
|---|---|---|---|
| `brace-expansion` | `< 1.1.17` · `< 5.0.9` | 1.1.18 · 5.0.9 | ✓ |
| `deepmerge-ts` | `< 8.0.0` | 8.0.1 | ✓ |
| `fast-uri` | `< 3.1.5` · `< 4.1.2` | 3.1.5 · 4.1.2 | ✓ |
| `js-yaml` | `< 4.3.1` | 4.3.1 · 5.3.0 | ✓ |
| `nanoid` | `< 3.3.18` | 3.3.18 | ✓ |
| `postcss` | `<= 8.5.22` | 8.5.26 | ✓ |

**Les neuf alertes sont périmées.** Toutes créées entre le 1er et le 17 août,
donc avant le correctif du 20 — et sur les neuf, `created_at == updated_at` :
Dependabot ne les a jamais réévaluées, ni après la fusion du 20, ni après celle
du 26. Rien de vulnérable n'est installé ; §1.2 tient sur le fond.

Ce qui ne tient pas, c'est la façon dont il a été vérifié. « Zéro alerte » y a
été mesuré au seul `pnpm audit`, et présenté comme l'état du dépôt. Un seul
outil ne donne pas l'état du dépôt : il donne son avis. C'est la même erreur de
méthode que le `grep` des révisions précédentes, avec un instrument plus
crédible — et c'est ce qui la rend plus facile à répéter.

**Le coût n'est pas une faille, c'est l'usure.** Neuf alertes hautes rouges en
permanence dans l'onglet Sécurité apprennent à ne plus l'ouvrir. La dixième, un
jour, sera vraie.

**Action** — fermer les neuf à la main (`gh api … /dependabot/alerts/N -X PATCH
-f state=dismissed -f dismissed_reason=fix_started`, ou l'interface), puis
vérifier que le compte retombe à zéro. Et ne plus écrire « zéro alerte » sans
dire **avec quoi** ça a été mesuré.

### 1.3 En-têtes de sécurité ✅

*Écrit le 21 août, livré et vérifié en production le 26 (§0.1).* Le constat de
départ a été mesuré sur la production, pas lu dans le code :

```
$ curl -D - https://chantia-api.onrender.com/health
HTTP/2 200
content-type · vary · access-control-allow-credentials · server: cloudflare
```

Pas un seul en-tête de protection, et ni Render ni Cloudflare n'en ajoutent.

`@fastify/helmet` est en place. **La configuration a deux formes**, et la raison
tient en une phrase : presque tous ces en-têtes protègent du HTML, or ce service
sert exactement une page HTML — Swagger, et seulement hors production (§1.4).

| en-tête | ce qu'il arrête | portée |
|---|---|---|
| `Strict-Transport-Security` | une première requête en clair sur un réseau hostile | tout le trafic |
| `X-Content-Type-Options` | un corps interprété autrement que son `content-type` | tout le trafic |
| `Content-Security-Policy` | le chargement de quoi que ce soit depuis une réponse | la page Swagger |
| `X-Frame-Options` / `frame-ancestors` | l'encadrement de la page dans un site tiers | la page Swagger |
| `Referrer-Policy` | un chemin d'API — donc un identifiant — parti vers un tiers | tout le trafic |

En production la politique est `default-src 'none'` : une réponse JSON n'a jamais
vocation à charger quoi que ce soit, donc la politique honnête est de tout
interdire. En développement, Swagger récupère le strict nécessaire.

Quatre décisions qui ne se lisent pas dans la configuration :

- **`useDefaults: false`.** Helmet fusionne ses propres directives par défaut si
  on le laisse faire. Une politique qu'on ne peut pas lire en entier est une
  politique sur laquelle on ne peut pas raisonner.
- **HSTS à un an, sans `preload`.** Le préchargement est une inscription sur une
  liste embarquée dans les navigateurs, lente et pénible à quitter. Ça se décide
  un jour exprès, pas par effet de bord d'un ajout d'en-têtes.
- **`Cross-Origin-Resource-Policy: same-origin` ne casse pas le front.** CORP
  n'est vérifié que sur les requêtes `no-cors` ; le front appelle l'API en mode
  CORS — en-tête `Authorization`, liste d'origines autorisées. Vérifié : le
  préflight et la requête réelle depuis `http://localhost:3000` passent.
- **COEP est désactivé.** L'isolation d'origine ne nous apporte rien (ni
  `SharedArrayBuffer`, ni minuteurs précis) et obligerait chaque sous-ressource
  tierce à donner son accord.

Sur la CSP de Swagger, une croyance répandue veut que helmet « casse Swagger ».
Vérification faite sur la page réellement servie : ses trois bundles sont
**externes et de même origine**, donc `script-src 'self'` les laisse passer ; il
ne reste que deux blocs `<style>` en ligne, d'où `style-src 'unsafe-inline'` et
rien de plus. Le test interdit explicitement d'étendre `unsafe-inline` aux
scripts — le jour où une version de Swagger en insère un, il échouera.

**Où ça vit.** `app/shared/security/security-headers.ts`, pas dans `main.ts` :
une politique que personne ne peut importer est une politique que personne ne
peut tester, et **chaque panne possible ici est silencieuse** — un en-tête qui
cesse d'être envoyé ressemble exactement à un en-tête qui n'a jamais existé.
`security-headers.spec.ts` fixe le résultat, 7 tests, vérifiés en cassant le code
exprès : Swagger rallumé en production et `nosniff` retiré font tomber un test
chacun.

### 1.4 `@fastify/static` — le diagnostic était faux ✅

*Écrit le 21 août, livré le 26 (§0.1).* Ce point disait l'inverse de la vérité
les 18 et 20 août :
« aucun code ne l'importe », donc « le retirer plutôt que le maintenir ».
**Suivre cette action aurait cassé Swagger en production.**

`grep` ne trouvait rien parce que Nest ne l'importe pas : il le charge **par son
nom, au démarrage**, par un `require()` dynamique qu'aucune recherche textuelle
ne voit.

```
main.ts                    SwaggerModule.setup('/api', …)
  swagger-module.js:99       serveStatic()
  swagger-module.js:105        app.useStaticAssets({ root, prefix, decorateReply })
  fastify-adapter.js:308         loadPackage('@fastify/static')
```

Le paquet servait donc les 1,5 Mo de bundles de Swagger, à chaque démarrage.

**Le vrai problème n'était pas l'inutilité, c'était un étau de versions :**

| qui | plage déclarée |
|---|---|
| `@nestjs/platform-fastify` | `^8 \|\| ^9` *(peer optionnelle)* |
| `@nestjs/swagger` | `^8 \|\| ^9 \|\| ^10` |
| **versions non vulnérables** | **`>= 10.1.2`** |

L'intersection est vide. Vérifié plutôt que déduit — verrou reconstruit en
`^9.3.0` dans une copie isolée, puis `pnpm audit` :

```
high      route guard bypass via path traversal          patché >= 10.1.1
moderate  authorization bypass via non-canonical paths   patché >= 10.1.2
```

Deux contournements de contrôle d'accès, sur le composant qui sert des fichiers.
Redescendre en `^9` pour faire taire l'avertissement de peer aurait rouvert
exactement ça. La montée en `^10` du 18 août était donc juste ; c'est sa
justification qui était fausse.

**La sortie de l'étau n'est pas une version, c'est de ne plus servir Swagger.**
Hors développement, `SwaggerModule.setup` n'est plus appelé, donc
`useStaticAssets()` non plus, donc `loadPackage` non plus. Le paquet est passé en
`devDependencies` : c'est là qu'il appartient, puisque seul le développement le
charge. En production, `/api`, `/api-json` et les bundles répondent 404 — vérifié
sur un vrai démarrage en `NODE_ENV=production`.

**Deux réserves, parce que ce point a déjà été annoncé clos à tort :**

- **L'avertissement de peer subsiste à l'installation.** `10.1.3` reste résolu
  pour le développement, et `platform-fastify` continue de ne pas déclarer `^10`.
  Il est maintenant sans portée en production — le paquet n'y est jamais chargé —
  mais il n'a pas disparu, et prétendre le contraire serait refaire l'erreur du
  18 août.
- **L'image de production contient toujours le paquet.** `Dockerfile.prod` fait
  un `pnpm install --frozen-lockfile` complet et recopie l'espace de travail
  entier ; les `devDependencies` sont donc dans l'image. Ce qui a changé, c'est
  que rien ne les charge. Élaguer l'étage `runner` est un chantier à part, qui
  vaut pour la taille de l'image plus que pour la sécurité.

### 1.4 bis — la spécification OpenAPI n'est plus publique ✅

Trouvé le 21 août en vérifiant les deux points ci-dessus, et plus lourd que les
deux — fermé en production le 26 (§0.1) :

```
GET /api        → 200  text/html      Swagger UI, sans authentification
GET /api-json   → 200  19 682 octets  spécification OpenAPI complète
```

Toute la surface de l'API était publiée : chaque route, chaque forme de DTO,
chaque champ. Ce n'est pas une faille — une API gardée reste gardée — mais c'est
une carte offerte à qui veut la lire, sans aucune contrepartie en production.

`swaggerEnabled` vaut `env !== 'production'` (`app.config.ts`). Le choix d'un
booléen dérivé plutôt que d'une variable d'environnement dédiée est délibéré :
une porte qui s'ouvre par configuration finit ouverte quelque part. Le jour où la
préproduction du §3.3 existera et voudra Swagger, ce sera une décision à prendre
à ce moment-là, pas une option laissée traîner d'avance.

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

### 2.2 Le trou du web est comblé ✅

Le décompte du 14 août — « 27 tests, `packages/shared` à zéro » — regardait
`apps/` seulement et concluait faux sur le reste. Le compte réel :

```
apps/api         102 tests   (9 fichiers)
packages/shared   40 tests   (3 fichiers)
apps/web          31 tests   (3 fichiers)
```

*(Au 21 août : +7, les en-têtes de sécurité, §1.3. Au 26 : +22, la traduction

des erreurs métier en HTTP (§2.4), +27 le parcours d'authentification, et +31
sur le front. Les deux derniers lots sont sur des branches distinctes ; le
compte de `apps/api` ci-dessus est celui de `develop`.)*

`packages/shared` couvre la politique de mot de passe (26), `ROLE_PERMISSIONS` (8)
et le calcul de coût (6) — c'est-à-dire exactement l'action classée en premier
par rendement ci-dessous, faite depuis les commits qui ont amené ces fonctions.
Elle est retirée de la liste.

**Le parcours d'authentification est couvert** *(26 août)*. C'était le point 1 de
la liste ci-dessous, et le dernier morceau du cœur produit qui ne l'était pas :
jusque-là, tous les tests de l'API portaient sur des failles trouvées après coup
— une élévation de privilège, une fuite de budget — plus la limitation de débit
(§1.1), les en-têtes (§1.3) et la traduction des erreurs (§2.4).

27 tests dans `identity/application/auth-flow.spec.ts`, qui font tourner les
vrais handlers sur des doubles en mémoire des cinq ports. Les doubles sont bêtes
volontairement : ce qui est testé, c'est **l'ordre des étapes et la forme des
refus**, et un faux malin finirait par s'affirmer lui-même.

Ce qu'ils retiennent, et qui ne se voit pas en lisant le code une fois :

| | ce qui casse si on l'inverse |
|---|---|
| `active` est testé **après** le mot de passe | sinon on apprend quelles adresses sont des comptes désactivés sans connaître un seul mot de passe |
| `simulateVerify()` sur une adresse inconnue | sans lui, « email inconnu » devient mesurablement plus rapide que « mauvais mot de passe » — l'oracle d'énumération |
| un compte invité jamais accepté répond comme un inconnu | sinon la réponse confirme l'adresse |
| un jeton retiré présenté deux fois révoque **toute la famille** | c'est la signature d'un vol : le client honnête serait déjà passé au remplaçant |
| l'expiration n'est **pas** traitée comme un vol | sinon partir en vacances déconnecte tous ses appareils |
| le remplaçant est écrit **avant** que l'ancien soit révoqué | l'ordre inverse, si la seconde écriture échoue, laisse le client avec deux jetons morts |
| l'invitation est brûlée **après** la validation du mot de passe | sinon un invité qui se trompe de mot de passe est enfermé dehors, et seul un admin peut le repêcher |

Vérifiés en cassant le code exprès, cinq mutations, cinq échecs — dont les deux
inversions d'ordre ci-dessus, qu'aucune relecture ne rattrape de façon fiable.

**Reste à faire :** `apps/web` — Vitest n'est même pas installé. Commencer par
les hooks de `model/`, qui sont testables sans rendu.

**Le front a des tests** *(28 août)*. Vitest n'y était pas installé du tout ;
il l'est, avec jsdom et Testing Library, et 31 tests couvrent `model/` — la
couche que `13-architecture-front.md` définit comme « ce que l'écran décide
avant de dessiner ». C'est la partie qui survit à une refonte visuelle.

La configuration reprend deux leçons déjà payées ailleurs :

- **`vite` est déclaré en `devDependencies`, pas surchargé.** C'est la leçon du
  §1.2, dont la version front aurait échoué en silence de la même façon.
- **L'alias `@/…` est redéclaré dans `vitest.config.mts`.** Vitest ne lit pas les
  `paths` de `tsconfig.json` — c'est exactement le piège qui a laissé les
  handlers de l'API sans tests pendant des mois.

Ce que les tests retiennent, et qui ne se voit pas à l'écran :

| | ce qui casse si on l'inverse |
|---|---|
| 401 et « email inconnu » donnent **une seule** clé d'erreur | le front rendrait l'oracle d'énumération que l'API refuse de donner |
| seul le 403 distingue un compte désactivé | c'est le seul cas qu'un nouvel essai ne répare pas |
| `pending` **reste** vrai après un succès | sinon le bouton se rallume sur une page qui s'en va |
| une réponse d'aperçu tardive est ignorée | sinon l'écran affiche le nom de l'invité précédent |
| seul le dernier segment de la clé i18n est gardé | sinon le composant cherche `form.errors.password.form.errors.password.minLength` |
| les erreurs sont des **clés**, jamais des phrases | sinon un message serveur en anglais atterrit sur un écran arabe |
| un écart de budget nul reste `neutral` | tomber pile est une coïncidence d'arrondi, pas un résultat |

Vérifiés en cassant le code exprès : cinq mutations, cinq échecs.

**Reste à faire** — les composants de `ui/` ne sont pas couverts, et c'est
volontaire pour l'instant : ils changent avec le design, `model/` non. Le point
suivant est §2.3.

### 2.3 Le cliquet de couverture ✅

*Fait le 28 août.* Rien n'empêchait la couverture de baisser. Un seuil bas mais
réel — et qui ne descend jamais — vaut mieux qu'un objectif élevé que personne
ne tient.

**Sonar a été écarté, délibérément.** Le dépôt est public, donc SonarQube Cloud
serait gratuit. Ce qui manquait ici était une seule chose : un chiffre qui ne
peut pas descendre. C'est dix lignes de configuration contre une intégration
tierce — et surtout, le mode d'échec récurrent de ce projet est *un signal que
personne ne lit* (§1.2 bis, quatre révisions de suite). Un profil Sonar par
défaut sort des centaines de *code smells* sur une base jeune : ce serait un
second tableau de bord ignoré à côté du premier. À rouvrir à l'arrivée d'un
deuxième développeur, ou d'un quatrième paquet.

**`all: true` est ce qui en fait un cliquet.** Laissé par défaut, v8 ne mesure
que les fichiers qu'un test a importés — dix nouveaux modules non testés ne
feraient bouger le pourcentage d'aucun point, et la barrière serait verte
pendant que le code empire. Mesuré ainsi, le premier chiffre du front était
80 % ; compté honnêtement, il est de 17 %.

Les seuils sont **la mesure du jour, arrondie au plancher** — pas un objectif :

| paquet | relevé | seuil posé | dénominateur |
|---|---|---|---|
| `packages/shared` | 82,6 % | 82 | `src/**`, hors barils |
| `apps/api` | 25,3 % | 25 | `src/**`, hors `main.ts`, `*.module.ts`, `scripts/` |
| `apps/web` | 17,5 % | 17 → **36** (2 sept.) | `src/**`, hors `src/app/**` (pages Next) |

**Le cliquet monte de 5 points par PR** *(règle posée le 2 septembre 2026)*, sur
chaque paquet que la PR touche. Un cliquet qui ne fait qu'empêcher la descente
laisse la dette où elle est ; celui-ci oblige chaque livraison à en rendre un
morceau. Le premier tour a fait +10 sur `apps/web` — le kit du design system,
`format.ts` et `i18n/config.ts` n'avaient aucun test (`docs/15` §4), donc le
premier lot était aussi le moins cher.

**La cible est 80 %, et pas davantage.** À ce niveau la montée s'arrête : ce qui
reste non couvert, ce sont les branches défensives, les gardes de type et le
câblage — les tester coûte plus qu'il ne rapporte, et une exigence de 100 %
produit surtout des tests écrits pour la mesure. Un paquet arrivé à 80 % garde
son cliquet, il ne peut donc pas redescendre, mais il ne doit plus rien.
`packages/shared` (82 %) y est déjà ; `apps/web` (36 %) et `apps/api` (25 %) ont
encore la montée devant eux.

Deux choses à ne pas se raconter sur ces chiffres :

- **La couverture basse de l'API est réelle**, pas un artefact de comptage.
  Retirer le câblage et les déclarations ne l'a fait passer que de 24,4 % à
  23,4 % : ce qui n'est pas testé, ce sont des repositories, des mappers, des
  gardes et les autres handlers — de la logique, pas de la plomberie.
- **Le cliquet mord au deuxième fichier non testé, pas au premier.** Vérifié en
  ajoutant des modules sonde un à un : 17,51 → 17,17 (passe) → 16,84 (bloque).
  L'arrondi au plancher laisse un demi-point de mou, soit environ un fichier.
  Serrer davantage ferait échouer la moindre ligne non couverte ajoutée dans un
  fichier déjà couvert, et le seuil finirait relevé à chaque commit — c'est-à-dire
  contourné.

Aucune modification de la CI : `pnpm test` porte désormais `--coverage`, et
l'étape existante l'exécute. Local et CI appliquent la même règle, ce qui évite
qu'un échec ne se découvre qu'après un push.

**La règle** — on relève un seuil quand le chiffre réel monte. On ne l'abaisse
jamais pour faire passer un build.

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
ce que l'appelant reçoit.

**La réserve est levée** *(26 août)*. Cette équivalence était tenue par
construction et par relecture ; elle l'est maintenant par 22 tests, répartis en
deux parce que la frontière l'impose — `app/` ne peut pas importer `identity/`,
spec comprise, et il n'y a pas d'exception à cette règle (§2.1). Le découpage
qui en sort est celui qu'il fallait de toute façon :

| fichier | ce qu'il fixe |
|---|---|
| `app/shared/presentation/domain-exception.filter.spec.ts` | ce qu'un appelant reçoit pour chaque `kind` — statut, `error`, et **l'ordre exact des clés** |
| `identity/domain/exceptions/identity.exceptions.spec.ts` | quel `kind` chacune des neuf déclare |

Trois choses que ces tests fixent et qu'un relecteur casserait sans le voir :

- **`RegistrationClosedException` répond 404 en voulant dire « interdit ».** Le
  message imite celui de Nest pour une route jamais déclarée. C'est du
  camouflage délibéré : un 403 confirmerait que l'inscription existe dans ce
  déploiement. Qui « corrige » ça en `forbidden` doit supprimer un test dont le
  commentaire explique pourquoi — c'est tout l'objet du test.
- **`errors` est absent, pas `undefined` ni `[]`.** Un front qui teste
  `'errors' in body` distingue les trois. L'assertion porte sur
  `Object.keys(body)`, donc sur l'ordre aussi.
- **Chaque `kind` de l'union a une ligne dans la table.** Elle est indexée à
  l'exécution : un `kind` ajouté sans ligne déstructure `undefined` et répond
  500. Le typage seul ne ferme pas ce trou.

Vérifiés en cassant le code exprès, comme au §1.3 : `RegistrationClosed` passée
en `forbidden`, `conflict` répondant 400, et `errors` toujours envoyé — un test
tombe, un test tombe, six tests tombent.

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

### 5.1 Les invitations partent ✅

*Fait le 28 août.* Le module créait le lien et publiait `UserInvitedEvent` ;
personne n'écoutait. Inviter quelqu'un demandait à l'admin de copier une URL et
de la transmettre à la main — c'est ce qui gardait l'application à un seul
utilisateur.

`InviteUserHandler` appelle maintenant le use case d'envoi. **Sans l'attendre :**

```ts
this.notifications.executeDetached(new SendNotificationCommand(…));
return { user, invitationPath, expiresAt };
```

`executeDetached` rend la main tout de suite et ne rejette jamais — un échec
d'envoi finit en ligne de journal. C'est la propriété que `08-identity-module.md`
exigeait (« un échec d'envoi ne doit pas annuler la création d'un compte »),
tenue par **la forme de l'appel** plutôt que par un bus d'événements.

`UserInvitedEvent` reste publié. Il n'est plus le mécanisme d'acheminement mais
un fait sur ce qui s'est passé : rien ne s'y abonne, et ce qui voudra le faire
plus tard — un journal d'audit, un fil in-app — le pourra encore.

**Le coût accepté, écrit ici plutôt que découvert plus tard :** un envoi perdu
est perdu. Pas de table d'attente, pas de renvoi. C'était le choix explicite
contre un outbox, qui reste ouvert le jour où ça fera mal.

### 5.1 bis L'écran des invitations ✅

*Fait le 2 septembre.* La liste de ce qui a été envoyé, avec deux actions et
deux filtres. Quatre décisions qui ne se lisent ni dans les routes ni dans les
composants :

- **« Supprimer » expire, il n'efface pas.** Le lien dans la boîte de l'invité
  cesse de fonctionner tout de suite — c'est le but du bouton — et la ligne
  reste : qui a invité qui, quand, et que ça a été annulé. Un compte créé par
  erreur puis annulé est exactement l'historique qu'un admin relit trois mois
  plus tard.
- **« Renvoyer » émet un nouveau lien et ferme l'ancien.** Le jeton en clair
  n'est stocké nulle part, donc le premier mail est irreproductible par
  construction ; et il ne faudrait pas le reproduire, puisque quelqu'un qui
  demande un renvoi se plaint le plus souvent d'un lien sur le point d'expirer.
- **Le statut est calculé, jamais stocké.** `acceptedAt` et `expiresAt` disent
  tout ; une colonne demanderait un travail périodique pour rester vraie, et
  serait fausse entre deux passages. La règle vit dans `@chantia/shared` et sert
  aux deux côtés — l'API refuse et l'interface n'affiche pas le bouton, à partir
  de la même fonction. Deux implémentations donneraient un bouton qui répond 409.
- **Une invitation d'un autre locataire répond 404, jamais 403.** `invitations`
  ne porte pas d'`organization_id` (elle pend de `app_users`), donc rien dans la
  base ne l'empêche : la cloison est dans les handlers, et un « interdit »
  confirmerait l'existence de la ligne à qui a deviné un identifiant.

**La création vit dans le même écran**, derrière « Nouvelle invitation » : un
**tiroir** (email, prénom, nom, rôle, langue) qui appelle `POST /users` —
un tiroir et pas une boîte centrée, pour que la liste reste lisible à côté et que
le formulaire ait toute la hauteur ; la confirmation de suppression, elle, reste
centrée, parce qu'une question doit tomber sous l'œil —
inviter quelqu'un *est* la façon dont un compte naît dans ce produit, il n'y a pas
d'étape où l'un existe sans l'autre. Deux détails qui comptent :

- **Le lien est affiché après l'envoi.** L'API le donne une seule fois — seule
  son empreinte est stockée — donc ce moment est le seul où il existe. Le mail
  est parti, mais un mail rebondit, tombe en spam, ou arrive dans une boîte que
  personne n'ouvre ; un admin à côté de la personne doit pouvoir le passer de la
  main à la main. Le cacher parce qu'« un email a été envoyé » ferait plus
  confiance à la livraison que la situation ne le mérite.
- **Le rôle par défaut est `worker`.** Un admin créé par un coup de molette est un
  problème de sécurité, un ouvrier non.
- **La liste dit qui a invité**, et `invited_by_id` est devenu une **vraie clé
  étrangère** le 2 septembre. Il était un UUID nu à dessein : une seconde relation
  vers `app_users` demande de la nommer des deux côtés, et c'était trop de
  cérémonie pour un champ d'audit que rien ne joignait. L'écran des invitations
  en a fait un champ qu'on joint — une fois par page — donc la raison a expiré.
  Deux choix dans la contrainte : **nullable**, parce qu'une invitation survit à
  l'admin parti, et **`ON DELETE SET NULL` jamais `CASCADE`**, parce que
  supprimer un chef ne doit pas emporter l'invitation en attente de quelqu'un
  d'autre. L'écran affiche alors un tiret plutôt qu'une case vide.

**Le défaut qui a mordu en production, le 2 septembre.** `WEB_APP_URL` n'était
pas dans `render.yaml`, et `identity.config.ts` retombait sur
`http://localhost:3000` — partout, sans un mot. Les invitations partaient donc
bien formées, avec un lien pointant vers la machine du destinataire : compte
créé, mail délivré, lien mort, rien dans les journaux. C'est le mode d'échec le
plus coûteux de ce projet, celui où *tout a l'air de marcher*. Le défaut survit
en développement, où il est juste ; en production l'API refuse maintenant de
démarrer sans la valeur. Un plantage au déploiement coûte moins cher qu'une
invitation qui ne mène nulle part.

**Un effet de bord assumé, et corrigé au passage :** `revokeOutstandingFor`
marquait les invitations remplacées comme *acceptées*. Ça les rendait
inutilisables, ce qui était le but — mais ça racontait qu'une personne avait
rejoint alors qu'elle n'avait rien fait. Invisible tant que rien n'affichait ces
lignes ; le premier écran qui les affiche l'a rendu faux à l'œil nu. Elles sont
désormais expirées.

### 5.2 Le module de notification ✅

*Fait le 28 août.* Un schéma Postgres `notification` à lui, une table
`notification_templates` dedans, une ligne par **(sujet, canal, langue)**,
contrainte d'unicité comprise.

| | |
|---|---|
| sujets | `invitation` |
| canaux | `email`, `sms` |
| langues | `fr`, `ar` |
| lignes semées | 4, par migration |

Quatre décisions qui ne se lisent pas dans le schéma :

- **Les templates ne se créent que par migration.** Un template est un contrat
  entre le code qui remplit les `{{placeholders}}` et le texte qui les lit ;
  laisser modifier l'un à l'exécution laisse les deux diverger sans rien pour
  l'attraper. Ajouter un sujet est donc une valeur d'enum **et** une migration.
- **Le canal `sms` a ses templates et aucun expéditeur.** C'est l'état voulu :
  la table est ce qu'une migration remplit, et rajouter un canal après coup
  obligerait à repasser sur chaque ligne. Un envoi SMS échoue bruyamment
  (`ChannelUnavailableException`), il ne retombe pas en silence sur l'email.
- **Pas d'`organization_id`.** Un template est du texte produit, pas de la donnée
  de locataire — et ça le tient hors de l'extension multi-tenant, qui ne filtre
  que les modèles portant la colonne. Un envoi marche donc avant qu'un locataire
  soit connu, ce qu'il faut pour inviter quelqu'un qui n'a pas encore de session.
- **`notification_locale` est un enum distinct de `identity.user_locale`.**
  Aucune dépendance ne traverse la frontière de schéma, les enums compris, sinon
  ni `pg_dump -n identity` ni `pg_dump -n notification` ne serait autonome. Le
  module vit dans son propre schéma pour la même raison : l'envoi n'est ni une
  affaire d'identité ni de la donnée métier, et il est destiné à devenir un
  service.

**Un template manquant refuse, il ne se rabat pas.** Chaque combinaison est
semée, donc une absence est une migration oubliée, pas une traduction manquante.
Se rabattre sur une autre langue enverrait de l'arabe à quelqu'un qui lit le
français, et masquerait la vraie panne.

**Un placeholder sans valeur refuse aussi.** Rendre `''` ou laisser
`{{invitationUrl}}` en clair envoie un vrai message à une vraie personne avec un
trou dedans — pire qu'un message non parti, parce que personne n'est prévenu.

**L'exception à la règle 4, assumée.** `invite-user.handler.ts` importe un module
métier, ce que le mur autour d'`identity/` interdit. C'est une dette écrite dans
`eslint.config.mjs` plutôt que cachée : l'exception fait **exactement un fichier
de large** — tout autre fichier d'`identity/` est refusé, donc le trou ne peut
pas s'élargir en silence. `NotificationModule` est `@Global`, ce qui évite un
second import dans `identity.module.ts`. Le jour du `POST /notifications`,
l'import devient un client HTTP et le bloc disparaît.

**L'expéditeur email écrit dans le journal en développement**, et c'est le défaut
voulu : rien ne doit se dresser entre un clone frais et un parcours d'invitation
qui marche. `EMAIL_PROVIDER` choisit au démarrage — absent, c'est le journal ;
`brevo`, c'est l'API HTTP de Brevo. Une valeur inconnue refuse de démarrer, parce
qu'une faute de frappe qui retomberait sur le journal serait une panne d'email
que personne ne voit.

**Brevo, et par HTTP.** Deux contraintes, pas deux préférences :

- Render **bloque les ports 25, 465 et 587 en sortie** sur les services web
  gratuits. Un transport SMTP n'y connecte pas — il attend puis expire. Un appel
  HTTPS passe, donc le fournisseur doit avoir une API.
- Resend, l'autre candidat, n'envoie gratuitement que **depuis un domaine vérifié
  par DNS**. Ce projet n'a pas de domaine. Brevo envoie depuis une boîte à soi
  vérifiée en un clic : 300 emails/jour, sans carte, sans expiration — pour
  quelques invitations par semaine, la marge est large.

Le fournisseur tient dans un fichier (`brevo-email.sender.ts`) et une valeur du
type union dans la config. Le port, le cas d'usage et identity ne bougent pas.
La procédure côté Render est dans [`07`](07-deploiement-render.md) §5.

**Vérifié pour de vrai, pas seulement compilé :** la migration a été appliquée
sur la base locale — elle a d'ailleurs échoué au premier essai, Postgres ne
recollant pas deux littéraux `E''` adjacents — les quatre lignes sont en base,
l'arabe intact, et l'API démarre avec `NotificationModule dependencies
initialized`. 23 tests, dont les trois refus ci-dessus, vérifiés en cassant le
code.

**Réserve** — l'arabe des gabarits n'a pas été relu par un locuteur natif. Un
email est plus exposé qu'un écran : il part sans qu'on le revoie.

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

Sur `develop`, donc en ligne — solide et documenté :

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

- **En-têtes de sécurité** — helmet, politique stricte en production et permissive
  pour la seule page Swagger, sept tests qui la fixent (§1.3)
- **Surface d'API non publiée** — Swagger et `/api-json` mis hors production, ce
  qui retire aussi `@fastify/static` du chemin d'exécution (§1.4)

Une réserve sur l'arabe : **il n'a jamais été relu par un locuteur natif.** Les
traductions sont plausibles, ce n'est pas la même chose que justes.
