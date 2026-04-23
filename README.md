# Crise Kitty

Bootstrap Fastify + Prisma + Zod + Swagger.

## Stack

- `Prisma` pour le client PostgreSQL et les types TypeScript.
- `@fastify/autoload` pour charger automatiquement `src/plugins` et `src/routes`.
- `Zod` pour valider les entrées et exposer les types.
- `@fastify/swagger` + `@fastify/swagger-ui` pour la doc interactive.

## Démarrage

1. Copier `.env.example` vers `.env`.
2. Lancer PostgreSQL avec `docker compose up -d postgres-db`.
3. Installer les dépendances avec `npm install`.
4. Générer Prisma avec `npm run prisma:generate`.
5. Appliquer une migration avec `npm run prisma:migrate`.
6. Démarrer l'API avec `npm run dev`.

La doc Swagger est exposée sur `/docs`.
