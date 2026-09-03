# 07 — Déploiement de l'API sur Render (gratuit)

Guide pas-à-pas pour déployer `apps/api` sur **Render** (Free) avec une base
**Postgres** (Supabase recommandé). La config est décrite dans `render.yaml`
à la racine.

> ⚠️ Free tier : l'API s'endort après ~15 min d'inactivité (cold start ~30 s au
> réveil). Acceptable pour la phase pilote.

## 1. Base de données Postgres (Supabase)

1. Créer un compte [Supabase](https://supabase.com) + un projet (ex. `chantia-test`).
2. Dans **Project Settings → Database → Connection string**, récupérer deux URLs :
   - **Pooler** (Transaction, port `6543`) → servira de `DATABASE_URL` (runtime).
   - **Direct** (Session, port `5432`) → servira de `DIRECT_URL` (migrations).
3. Ajouter `?sslmode=require` si non présent, et remplacer `[YOUR-PASSWORD]` par
   le mot de passe de la base.

> Sur une base Postgres simple (sans pooler), mettre la **même** URL dans
> `DATABASE_URL` et `DIRECT_URL`.

## 2. Déployer l'API (Render Blueprint)

1. Créer un compte [Render](https://render.com) connecté à GitHub.
2. **New → Blueprint**, sélectionner le dépôt `chantier-routier`.
3. Render lit `render.yaml` et propose le service `chantia-api` (Docker,
   `apps/api/Dockerfile.prod`, health check `/health`).
4. Renseigner les variables secrètes (marquées `sync: false`) :
   - `DATABASE_URL` = URL **pooler** Supabase
   - `DIRECT_URL` = URL **directe** Supabase
   - `CORS_ORIGINS` = URL du web (ex. `https://mon-app.vercel.app`) — optionnel au début
   - `BREVO_API_KEY` et `EMAIL_FROM_ADDRESS` = envoi des emails, voir §5
   - `WEB_APP_URL` est dans `render.yaml` avec sa valeur (l'URL Vercel) : c'est
     elle qui transforme un chemin d'invitation en lien cliquable dans le mail.
     Son absence a envoyé des invitations pointant vers `http://localhost:3000`
     le 2 septembre 2026 — l'API retombait sur son défaut de développement sans
     rien dire. Elle refuse désormais de démarrer sans, en production.
5. Lancer le déploiement. Au boot, le conteneur applique les migrations
   (`prisma migrate deploy`) puis démarre le serveur. La migration seed crée
   l'organisation **ELLOUZE construction** (UUID fixe).

## 3. Vérifier

```bash
API=https://chantia-api.onrender.com
curl $API/health          # → {"status":"ok"}   (route publique)
# Swagger : https://chantia-api.onrender.com/api

# Toutes les autres routes exigent un jeton. `/auth/register` crée une organisation
# ET son premier admin — c'est la seule façon d'entrer. (L'organisation seedée par
# la migration n'a aucun compte : elle ne sert qu'aux données de démo locales.)
TOKEN=$(curl -s -X POST $API/auth/register -H 'Content-Type: application/json' \
  -d '{"organizationName":"Mon entreprise","email":"admin@exemple.fr",
       "password":"une phrase de passe longue","firstName":"Ada","lastName":"Lovelace"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["accessToken"])')

curl -H "Authorization: Bearer $TOKEN" $API/worksites   # → {"items":[],...}
```

## 4. Déploiements suivants

`autoDeploy: true` : chaque push sur la branche déployée redéclenche un build +
migrations automatiques. Les migrations étant idempotentes, un redémarrage à
froid ne recrée pas les données.

## 5. Envoi des emails (Brevo, gratuit)

Sans ça, les invitations partent dans le journal : le compte est bien créé, mais
personne ne reçoit le lien.

**Pourquoi une API HTTP et pas SMTP.** Render bloque le trafic sortant vers les
ports 25, 465 et 587 sur les services web gratuits ; un transport `nodemailer`
n'y connecte jamais, il attend puis expire. Un appel HTTPS passe.

**Pourquoi Brevo et pas Resend.** L'offre gratuite de Resend n'envoie que depuis
un domaine vérifié par DNS, et ce projet n'a pas de domaine (`*.onrender.com`,
`*.vercel.app`). Brevo envoie depuis une simple boîte à soi, vérifiée en cliquant
un lien : **300 emails/jour, sans carte, sans expiration**. Les invitations en
consomment quelques-unes par semaine.

1. Créer un compte sur [brevo.com](https://www.brevo.com) (gratuit).
2. **Senders, Domains & Dedicated IPs → Senders → Add a sender** : l'adresse
   d'expédition (une boîte à laquelle on a accès). Brevo envoie un mail de
   validation ; tant qu'il n'est pas cliqué, chaque envoi répond `HTTP 400
   sender not verified`.
3. **SMTP & API → API keys → Generate a new API key** (v3).
4. Sur Render, renseigner `BREVO_API_KEY` et `EMAIL_FROM_ADDRESS` (l'expéditeur
   vérifié). `EMAIL_PROVIDER=brevo` est déjà dans `render.yaml`.
5. Redéployer, puis vérifier dans les logs la ligne `NotificationModule Email
   channel: brevo`. Si elle dit `log`, la variable n'est pas passée.

> Le passage à un vrai domaine plus tard ne change rien au code : chez Brevo on
> vérifie le domaine (SPF/DKIM) et on change `EMAIL_FROM_ADDRESS`.

## 6. Le front sur Vercel — quand un déploiement est sauté

Vercel construit `apps/web` à chaque poussée sur `develop`, qui est sa branche de
production. Dans un monorepo il saute les commits qui ne concernent pas le
projet — ce qu'on veut : un refactor du back n'a pas à reconstruire le front.

**Sa détection automatique ne regarde que le dossier racine du projet**, donc
`apps/web`. Deux conséquences, et la seconde a mordu le 2 septembre 2026 :

- Une PR qui ne touche que `packages/shared` — un contrat, un enum, une règle
  partagée — serait sautée, et le front resterait sur l'ancienne version du
  paquet pendant que l'API, elle, aurait bougé.
- Sur un commit de fusion, la comparaison `HEAD^..HEAD` peut prendre le mauvais
  parent et conclure « rien de changé ». Le merge de la PR #30 n'a produit aucun
  déploiement alors qu'il touchait 29 fichiers d'`apps/web`.

D'où le `ignoreCommand` dans `apps/web/vercel.json`, qui remplace la détection
automatique :

```bash
npx turbo-ignore @chantia/web
```

> La convention Vercel est inversée : **sortie 0 = on saute, sortie 1 = on
> construit.** `turbo-ignore` respecte cette convention et répond à la bonne
> question — « ce commit affecte-t-il `@chantia/web` **ou l'un de ses paquets
> dont il dépend** ? » — en interrogeant le graphe Turborepo. Une modification de
> `packages/shared` déclenche donc le build sans qu'on ait à l'énumérer.

> ⚠️ **Le piège qui a coûté une demi-journée.** La première version était un
> `git diff --quiet HEAD^ HEAD -- apps/web packages/shared`. Elle n'a **jamais**
> construit : Vercel exécute cette commande **depuis le dossier racine du
> projet**, donc `apps/web` — et `git diff -- apps/web` y cherche
> `apps/web/apps/web`, ne trouve rien, et sort 0, c'est-à-dire « saute ». Le
> symptôme est le pire possible : aucune erreur, aucun build rouge, juste une
> production qui reste en arrière pendant que les previews des branches, elles,
> se construisent normalement. Si un chemin doit être écrit à la main, il est
> relatif à `apps/web` (`.` et `../../packages/shared`) — raison de plus de
> laisser `turbo-ignore` le faire.

**Le bouton « Redeploy » ne rattrape pas un déploiement manqué** : il rejoue le
*même commit*, pas la tête de la branche. Pour repartir sur le dernier état de
`develop`, il faut une nouvelle poussée — ou `npx vercel --prod` depuis le poste.

## 7. Notes

- **PORT** : injecté automatiquement par Render, lu via `process.env.PORT`.
- **Cold start** : pour l'éviter, un cron externe (ex. GitHub Actions) peut
  pinger `/health` régulièrement, ou passer au plan Starter (~7 $/mois).
- Voir le plan global dans [`04-deploiement-gratuit.md`](04-deploiement-gratuit.md).
