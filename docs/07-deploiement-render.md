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

## 5. Notes

- **PORT** : injecté automatiquement par Render, lu via `process.env.PORT`.
- **Cold start** : pour l'éviter, un cron externe (ex. GitHub Actions) peut
  pinger `/health` régulièrement, ou passer au plan Starter (~7 $/mois).
- Voir le plan global dans [`04-deploiement-gratuit.md`](04-deploiement-gratuit.md).
