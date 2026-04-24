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

## Authentification & Rôles (RBAC)

### Architecture RBAC

Crise Kitty utilise un système **Role-Based Access Control (RBAC)** à deux niveaux :

En complément, les rôles sont catégorisés par **domaine** :
- **Plateforme** : gère l’outil (SaaS)
- **Simulation** : agit dans la crise (scénarios/sessions)

#### 1. Rôles Globaux (Plateforme)
- **Super Admin** : Accès total à la plateforme (équipe interne)
- **Account Manager** : Gère les factures, quotas et subscriptions des organisations

#### 2. Rôles par Organisation
- **Admin Client** : Gère les utilisateurs et accès de sa propre organisation
- **Concepteur/Animateur** : Crée les scénarios et lance les sessions de simulation
- **Observateur/Auditeur** : Accès en lecture seule pour évaluer la performance
- **Apprenant/Joueur** : Accès limité aux interfaces de simulation

### Permissions Fines

Chaque rôle dispose d'un ensemble de permissions basées sur :
- **Ressource** : organizations, scenarios, sessions, reports, etc.
- **Action** : view, create, edit, delete, manage, publish, trigger

Exemples :
- `edit_scenario` - Éditer un scénario
- `view_retex_reports` - Voir les rapports RETEX
- `trigger_injections` - Déclencher une alerte/injection

### Page d'Administration

Accès : `http://localhost:5000/admin`

La page admin est accessible aux utilisateurs avec les permissions appropriées :
- **Organisations** : Créer, éditer organisations et hiérarchies
- **Utilisateurs** : Gérer utilisateurs globaux et leurs rôles
- **Rôles & Permissions** : Configurer les rôles et permissions (RBAC)
- **Facturation** : Gérer les quotas et abonnements
- **Logs d'Audit** : Consulter l'historique des actions
- **Scénarios** : Gérer les scénarios globaux
- **Sessions Actives** : Monitorer les sessions en cours
- **Profil Organisation** : Éditer les détails et marquage blanc

### Marquage Blanc (White-Label)

Chaque organisation peut personnaliser son apparence :
- Logo personnalisé
- Nom de marque
- Couleurs primaires et secondaires
- Nom de session configurable

Configuration accessible dans : `Admin > Organisations > Profil`

### Tables de Base de Données

- `roles` - Définition des rôles
- `permissions` - Définition des permissions
- `role_permissions` - Mapping rôles ↔ permissions
- `user_global_roles` - Rôles globaux des utilisateurs
- `organization_member_roles` - Rôles des membres dans une organisation

### Endpoints Admin

```
GET  /admin/stats              - Statistiques globales
GET  /admin/roles              - Lister tous les rôles
GET  /admin/roles/:id          - Détails d'un rôle
POST /admin/roles              - Créer un nouveau rôle
GET  /admin/organizations      - Lister les organisations
GET  /admin/organizations/:id  - Détails d'une organisation
GET  /admin/users              - Lister les utilisateurs
GET  /auth/permissions         - Permissions de l'utilisateur actuel
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
- `GET /auth/permissions`
- `GET /auth/organization-context`
- `POST /auth/active-organization`

### Admin (Super Admin & Account Manager)

- `GET /admin/stats`
- `GET /admin/roles`
- `GET /admin/roles/:id`
- `POST /admin/roles`
- `GET /admin/organizations`
- `GET /admin/organizations/:id`
- `GET /admin/users`

### Organisation (client)

- `GET /organizations`
- `GET /organizations/:id`
- `PATCH /organizations/:id`

### UI (navigation)

- `GET /hub` - Page "Accès" (boutons Plateforme / Organisation / Simulation)
- `GET /organization` - Profil de l’organisation active

### Utilitaires

- `GET /docs`
- `GET /api/users`
- `POST /api/users`

Depuis le navigateur, passe toujours par l'origine `5000` :
- `http://localhost:5000/api/auth/register`
- `http://localhost:5000/api/auth/login`
- `http://localhost:5000/api/admin/stats`

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
- [src/routes/admin.ts](/home/alexandre/Bureau/DEV/crise-kitty/src/routes/admin.ts)
- [src/routes/auth-permissions.ts](/home/alexandre/Bureau/DEV/crise-kitty/src/routes/auth-permissions.ts)
- [src/routes/users.ts](/home/alexandre/Bureau/DEV/crise-kitty/src/routes/users.ts)
- [ui/app/admin/page.tsx](/home/alexandre/Bureau/DEV/crise-kitty/ui/app/admin/page.tsx)
- [ui/app/admin/organizations/page.tsx](/home/alexandre/Bureau/DEV/crise-kitty/ui/app/admin/organizations/page.tsx)
- [ui/app/admin/roles/page.tsx](/home/alexandre/Bureau/DEV/crise-kitty/ui/app/admin/roles/page.tsx)
- [ui/components/auth-form.tsx](/home/alexandre/Bureau/DEV/crise-kitty/ui/components/auth-form.tsx)
- [ui/components/profile-client.tsx](/home/alexandre/Bureau/DEV/crise-kitty/ui/components/profile-client.tsx)
- [ui/components/topbar.tsx](/home/alexandre/Bureau/DEV/crise-kitty/ui/components/topbar.tsx)

## Notes

- `pgAdmin` est exposé sur `8080`
- le cache `ui/.next` peut être créé par le conteneur Docker avec un autre owner ; si un build local Next échoue avec une erreur `EACCES`, il faut nettoyer ce dossier
- la base métier complète décrite dans `pg-database.sql` est plus large que l'API actuellement exposée ; seule la partie auth/users est branchée pour l'instant
