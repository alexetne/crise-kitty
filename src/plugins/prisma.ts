import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export default fp(async (app) => {
  const prisma = new PrismaClient();

  const maxAttempts = 15;
  const retryDelayMs = 2_000;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await prisma.$connect();
      break;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }

      app.log.warn(
        { attempt, maxAttempts },
        'Prisma connection failed, retrying...',
      );

      await new Promise((resolve) => {
        setTimeout(resolve, retryDelayMs);
      });
    }
  }

  const compatibilityPatches = [
    `
      CREATE TABLE IF NOT EXISTS "simulation_ui_sessions" (
        "id" uuid PRIMARY KEY NOT NULL,
        "user_id" uuid NOT NULL REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE,
        "session_key" varchar(100) NOT NULL,
        "route_path" varchar(255) NOT NULL,
        "state" jsonb NOT NULL DEFAULT ('{}'::jsonb),
        "version" int NOT NULL DEFAULT 1,
        "last_client_saved_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT (now()),
        "updated_at" timestamptz NOT NULL DEFAULT (now())
      )
    `,
    'CREATE INDEX IF NOT EXISTS "idx_simulation_ui_sessions_user_id" ON "simulation_ui_sessions" ("user_id")',
    'CREATE INDEX IF NOT EXISTS "idx_simulation_ui_sessions_updated_at" ON "simulation_ui_sessions" ("updated_at")',
    'CREATE UNIQUE INDEX IF NOT EXISTS "idx_simulation_ui_sessions_user_id_session_key" ON "simulation_ui_sessions" ("user_id", "session_key")',
    'ALTER TABLE "user_sessions" ADD COLUMN IF NOT EXISTS "device_id" varchar(120)',
    'ALTER TABLE "user_sessions" ADD COLUMN IF NOT EXISTS "concurrency_detected_at" timestamptz',
    'CREATE INDEX IF NOT EXISTS "idx_user_sessions_device_id" ON "user_sessions" ("device_id")',
    'CREATE INDEX IF NOT EXISTS "idx_user_sessions_user_id_revoked_at" ON "user_sessions" ("user_id", "revoked_at")',
    'ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "session_timeout_minutes" int NOT NULL DEFAULT 30',
    'ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "parent_organization_id" uuid',
    'ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "logo_url" text',
    'ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "brand_name" varchar(150)',
    'ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "brand_primary_color" varchar(20)',
    'ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "brand_secondary_color" varchar(20)',
    'ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "brand_accent_color" varchar(20)',
    'ALTER TABLE "user_sessions" ADD COLUMN IF NOT EXISTS "active_organization_id" uuid',
    'CREATE INDEX IF NOT EXISTS "idx_organizations_parent_organization_id" ON "organizations" ("parent_organization_id")',
    'CREATE INDEX IF NOT EXISTS "idx_user_sessions_active_organization_id" ON "user_sessions" ("active_organization_id")',
    `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'organizations_parent_organization_id_fkey'
        ) THEN
          ALTER TABLE "organizations"
            ADD CONSTRAINT "organizations_parent_organization_id_fkey"
            FOREIGN KEY ("parent_organization_id")
            REFERENCES "organizations" ("id")
            DEFERRABLE INITIALLY IMMEDIATE;
        END IF;
      END $$;
    `,
    `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'user_sessions_active_organization_id_fkey'
        ) THEN
          ALTER TABLE "user_sessions"
            ADD CONSTRAINT "user_sessions_active_organization_id_fkey"
            FOREIGN KEY ("active_organization_id")
            REFERENCES "organizations" ("id")
            DEFERRABLE INITIALLY IMMEDIATE;
        END IF;
      END $$;
    `,
  ];

  for (const statement of compatibilityPatches) {
    await prisma.$executeRawUnsafe(statement);
  }

  app.decorate('prisma', prisma);

  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
});
