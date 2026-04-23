# Crise Kitty

Stack de dev complète pour une app de simulation de crise avec :
- une API `Fastify` + `Prisma` + `Zod` + `Swagger`
- une UI `Next.js`
- une base `PostgreSQL`
- `pgAdmin` pour l'inspection SQL

## Architecture

- `ui/` : frontend `Next.js`
- `src/` : API `Fastify`
- `prisma/schema.prisma` : mapping Prisma sur les tables réelles
- `pg-database.sql` : schéma PostgreSQL source chargé au démarrage de la base
- `docker-compose.yml` : orchestration locale

L'application est servie sur une seule origine publique :
- UI : `http://localhost:5000`
- API via proxy Next : `http://localhost:5000/api`
- Swagger via proxy Next : `http://localhost:5000/docs`
- pgAdmin : `http://localhost:8080`

Le backend Fastify écoute en interne sur `5001`, mais n'est pas exposé publiquement par Docker.

## Base de données

Le schéma PostgreSQL réel est défini dans [pg-database.sql](/home/alexandre/Bureau/DEV/crise-kitty/pg-database.sql).

L'API est alignée en priorité sur ces tables :
- `users`
- `user_identities`

Le fichier [prisma/schema.prisma](/home/alexandre/Bureau/DEV/crise-kitty/prisma/schema.prisma) mappe actuellement ces structures pour que Prisma puisse les consommer proprement.

Important :
- `pg-database.sql` n'est exécuté que lors de l'initialisation du volume Postgres
- si tu changes ce fichier et que le volume existe déjà, Postgres ne le rejouera pas automatiquement

Pour repartir sur une base propre :

```bash
docker compose down -v
docker compose up --build
```

## Démarrage

### Avec Docker

```bash
docker compose down -v
docker compose up --build
```

Cela lance :
- `postgres-db`
- `pgadmin`
- `app`
- `ui`

### Sans Docker pour l'API

Pré-requis :
- une base PostgreSQL compatible avec [pg-database.sql](/home/alexandre/Bureau/DEV/crise-kitty/pg-database.sql)
- un fichier `.env`

Commandes :

```bash
npm install
npm run prisma:generate
npm run dev
```

### Sans Docker pour la UI

```bash
cd ui
npm install
npm run dev
```

## Variables d'environnement

Fichier racine `.env` :

```env
DATABASE_URL="postgresql://user:password@localhost:5432/myapp_db"
PORT=5001
HOST=0.0.0.0
JWT_SECRET="change-me-in-production"
NEXT_PUBLIC_API_URL="/api"
```

## Endpoints principaux

### Publics

- `GET /`
- `GET /health`
- `POST /auth/register`
- `POST /auth/login`

### Authentifiés

- `GET /auth/profile`

### Utilitaires

- `GET /docs`
- `GET /api/users`
- `POST /api/users`

Depuis le navigateur, passe toujours par l'origine `5000` :
- `http://localhost:5000/api/auth/register`
- `http://localhost:5000/api/auth/login`
- `http://localhost:5000/api/auth/profile`

## Auth actuelle

L'auth locale repose sur :
- `users`
- `user_identities`
- `provider = local`
- mot de passe hashé avec `bcryptjs`
- JWT signé côté API avec `@fastify/jwt`

Le JWT contient :
- `userId`
- `email`

## Frontend

La UI `Next.js` couvre actuellement :
- page d'accueil
- `register`
- `login`
- `profile`

Le frontend appelle l'API via des rewrites définies dans [ui/next.config.ts](/home/alexandre/Bureau/DEV/crise-kitty/ui/next.config.ts), ce qui permet de tout servir sur `5000`.

## Swagger

Swagger UI est servi derrière Next sur :

```text
http://localhost:5000/docs
```

En interne, la doc vient du backend Fastify.

## Fichiers clés

- [docker-compose.yml](/home/alexandre/Bureau/DEV/crise-kitty/docker-compose.yml)
- [pg-database.sql](/home/alexandre/Bureau/DEV/crise-kitty/pg-database.sql)
- [prisma/schema.prisma](/home/alexandre/Bureau/DEV/crise-kitty/prisma/schema.prisma)
- [src/routes/auth.ts](/home/alexandre/Bureau/DEV/crise-kitty/src/routes/auth.ts)
- [src/routes/users.ts](/home/alexandre/Bureau/DEV/crise-kitty/src/routes/users.ts)
- [ui/app/page.tsx](/home/alexandre/Bureau/DEV/crise-kitty/ui/app/page.tsx)
- [ui/components/auth-form.tsx](/home/alexandre/Bureau/DEV/crise-kitty/ui/components/auth-form.tsx)
- [ui/components/profile-client.tsx](/home/alexandre/Bureau/DEV/crise-kitty/ui/components/profile-client.tsx)

## Notes

- `pgAdmin` est exposé sur `8080`
- le cache `ui/.next` peut être créé par le conteneur Docker avec un autre owner ; si un build local Next échoue avec une erreur `EACCES`, il faut nettoyer ce dossier
- la base métier complète décrite dans `pg-database.sql` est plus large que l'API actuellement exposée ; seule la partie auth/users est branchée pour l'instant
