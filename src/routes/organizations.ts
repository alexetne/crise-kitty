import { z } from 'zod/v4';
import type {
  FastifyPluginAsyncZod,
  ZodTypeProvider,
} from 'fastify-type-provider-zod';
import type { AccessibleOrganizationRow } from '../lib/organization-context.js';
import {
  assertOrganizationAccess,
  getAccessibleOrganizations,
} from '../lib/organization-context.js';
import { createUuid } from '../lib/user-mapper.js';

const hexColorSchema = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);

const organizationSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  parentOrganizationId: z.uuid().nullable(),
  logoUrl: z.string().nullable(),
  brandName: z.string().nullable(),
  brandPrimaryColor: z.string().nullable(),
  brandSecondaryColor: z.string().nullable(),
  brandAccentColor: z.string().nullable(),
  sessionTimeoutMinutes: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const organizationTreeNodeSchema: z.ZodType<{
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  parentOrganizationId: string | null;
  logoUrl: string | null;
  brandName: string | null;
  brandPrimaryColor: string | null;
  brandSecondaryColor: string | null;
  brandAccentColor: string | null;
  sessionTimeoutMinutes: number;
  createdAt: string;
  updatedAt: string;
  children: unknown[];
}> = organizationSchema.extend({
  children: z.array(z.lazy(() => organizationTreeNodeSchema)),
});

const organizationContextResponseSchema = z.object({
  organizations: z.array(organizationTreeNodeSchema),
});

const createOrganizationBodySchema = z.object({
  name: z.string().min(1).max(150),
  slug: z.string().min(1).max(150),
  description: z.string().max(2000).optional(),
  parentOrganizationId: z.uuid().optional(),
  logoUrl: z.url().optional(),
  brandName: z.string().min(1).max(150).optional(),
  brandPrimaryColor: hexColorSchema.optional(),
  brandSecondaryColor: hexColorSchema.optional(),
  brandAccentColor: hexColorSchema.optional(),
  sessionTimeoutMinutes: z.number().int().min(5).max(480).optional(),
});

const updateOrganizationBodySchema = createOrganizationBodySchema.partial();

const organizationParamsSchema = z.object({
  id: z.uuid(),
});

const scenarioSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid().nullable(),
  code: z.string(),
  title: z.string(),
  summary: z.string().nullable(),
  status: z.string(),
  visibility: z.string(),
  mode: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const createScenarioBodySchema = z.object({
  crisisDomainId: z.uuid(),
  code: z.string().min(1).max(50),
  title: z.string().min(1).max(200),
  summary: z.string().max(4000).optional(),
  visibility: z.enum(['private', 'organization', 'public_catalog']).default('organization'),
  mode: z.enum(['scripted', 'hybrid', 'ai']).default('scripted'),
});

const auditLogSchema = z.object({
  id: z.string(),
  organizationId: z.uuid().nullable(),
  eventType: z.string(),
  eventData: z.unknown().nullable(),
  createdAt: z.string().datetime(),
});

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  parent_organization_id: string | null;
  logo_url: string | null;
  brand_name: string | null;
  brand_primary_color: string | null;
  brand_secondary_color: string | null;
  brand_accent_color: string | null;
  session_timeout_minutes: number;
  created_at: Date;
  updated_at: Date;
};

type ScenarioRow = {
  id: string;
  organization_id: string | null;
  code: string;
  title: string;
  summary: string | null;
  status: string;
  visibility: string;
  mode: string;
  created_at: Date;
  updated_at: Date;
};

type AuditLogRow = {
  id: bigint;
  organization_id: string | null;
  event_type: string;
  event_data: unknown | null;
  created_at: Date;
};

function mapOrganizationRow(row: OrganizationRow | AccessibleOrganizationRow) {
  const isAccessibleRow = 'organization_id' in row;
  const createdAt =
    isAccessibleRow ? row.organization_created_at : row.created_at;
  const updatedAt =
    isAccessibleRow ? row.organization_updated_at : row.updated_at;

  return {
    id: isAccessibleRow ? row.organization_id : row.id,
    name: isAccessibleRow ? row.organization_name : row.name,
    slug: isAccessibleRow ? row.organization_slug : row.slug,
    description: isAccessibleRow ? row.organization_description : row.description,
    isActive: isAccessibleRow ? row.organization_is_active : row.is_active,
    parentOrganizationId: row.parent_organization_id,
    logoUrl: row.logo_url,
    brandName: row.brand_name,
    brandPrimaryColor: row.brand_primary_color,
    brandSecondaryColor: row.brand_secondary_color,
    brandAccentColor: row.brand_accent_color,
    sessionTimeoutMinutes: row.session_timeout_minutes,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}

function mapScenarioRow(row: ScenarioRow) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    code: row.code,
    title: row.title,
    summary: row.summary,
    status: row.status,
    visibility: row.visibility,
    mode: row.mode,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapAuditLogRow(row: AuditLogRow) {
  return {
    id: row.id.toString(),
    organizationId: row.organization_id,
    eventType: row.event_type,
    eventData: row.event_data,
    createdAt: row.created_at.toISOString(),
  };
}

const organizationsRoute: FastifyPluginAsyncZod = async (app) => {
  const zodApp = app.withTypeProvider<ZodTypeProvider>();

  zodApp.get(
    '/organizations',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['organizations'],
        summary: 'Retourne les organisations accessibles sous forme hiérarchique',
        security: [{ bearerAuth: [] }],
        response: {
          200: organizationContextResponseSchema,
        },
      },
    },
    async (request) => {
      const memberships = await getAccessibleOrganizations(app, request.user.userId);
      const nodes = memberships.map((membership) => ({
        ...mapOrganizationRow(membership),
        children: [] as Array<z.infer<typeof organizationTreeNodeSchema>>,
      }));

      const nodeMap = new Map(nodes.map((node) => [node.id, node]));
      const roots: typeof nodes = [];

      for (const node of nodes) {
        if (node.parentOrganizationId && nodeMap.has(node.parentOrganizationId)) {
          nodeMap.get(node.parentOrganizationId)?.children.push(node);
        } else {
          roots.push(node);
        }
      }

      return { organizations: roots };
    },
  );

  zodApp.post<{ Body: z.infer<typeof createOrganizationBodySchema> }>(
    '/organizations',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['organizations'],
        summary: 'Crée une organisation ou sous-entité',
        security: [{ bearerAuth: [] }],
        body: createOrganizationBodySchema,
        response: {
          201: organizationSchema,
          403: z.object({ message: z.string() }),
          409: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      if (request.body.parentOrganizationId) {
        const parentMembership = await assertOrganizationAccess(
          app,
          request.user.userId,
          request.body.parentOrganizationId,
        );

        if (!parentMembership) {
          return reply.code(403).send({ message: 'Parent organization access denied' });
        }
      }

      const existing = await app.prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM organizations
        WHERE slug = ${request.body.slug}
          AND deleted_at IS NULL
        LIMIT 1
      `;

      if (existing.length > 0) {
        return reply.code(409).send({ message: 'Organization slug already in use' });
      }

      const organizationId = createUuid();
      const [organization] = await app.prisma.$queryRaw<OrganizationRow[]>`
        INSERT INTO organizations (
          id,
          name,
          slug,
          description,
          parent_organization_id,
          logo_url,
          brand_name,
          brand_primary_color,
          brand_secondary_color,
          brand_accent_color,
          session_timeout_minutes
        )
        VALUES (
          ${organizationId}::uuid,
          ${request.body.name},
          ${request.body.slug},
          ${request.body.description ?? null},
          ${request.body.parentOrganizationId ?? null}::uuid,
          ${request.body.logoUrl ?? null},
          ${request.body.brandName ?? null},
          ${request.body.brandPrimaryColor ?? null},
          ${request.body.brandSecondaryColor ?? null},
          ${request.body.brandAccentColor ?? null},
          ${request.body.sessionTimeoutMinutes ?? 30}
        )
        RETURNING
          id,
          name,
          slug,
          description,
          is_active,
          parent_organization_id,
          logo_url,
          brand_name,
          brand_primary_color,
          brand_secondary_color,
          brand_accent_color,
          session_timeout_minutes,
          created_at,
          updated_at
      `;

      await app.prisma.$executeRaw`
        INSERT INTO organization_members (
          id,
          organization_id,
          user_id,
          status
        )
        VALUES (
          ${createUuid()}::uuid,
          ${organizationId}::uuid,
          ${request.user.userId}::uuid,
          'active'::membership_status
        )
      `;

      await app.prisma.$executeRaw`
        INSERT INTO user_audit_logs (
          user_id,
          actor_user_id,
          organization_id,
          event_type,
          event_data
        )
        VALUES (
          ${request.user.userId}::uuid,
          ${request.user.userId}::uuid,
          ${organizationId}::uuid,
          'organization_created',
          jsonb_build_object(
            'name', ${request.body.name},
            'slug', ${request.body.slug},
            'parentOrganizationId', ${request.body.parentOrganizationId ?? null}
          )
        )
      `;

      return reply.code(201).send(mapOrganizationRow(organization));
    },
  );

  zodApp.patch<{
    Params: z.infer<typeof organizationParamsSchema>;
    Body: z.infer<typeof updateOrganizationBodySchema>;
  }>(
    '/organizations/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['organizations'],
        summary: 'Met à jour la hiérarchie ou le marquage blanc d une organisation',
        security: [{ bearerAuth: [] }],
        params: organizationParamsSchema,
        body: updateOrganizationBodySchema,
        response: {
          200: organizationSchema,
          403: z.object({ message: z.string() }),
          404: z.object({ message: z.string() }),
          409: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const membership = await assertOrganizationAccess(
        app,
        request.user.userId,
        request.params.id,
      );

      if (!membership) {
        return reply.code(403).send({ message: 'Organization access denied' });
      }

      if (request.body.parentOrganizationId) {
        const parentMembership = await assertOrganizationAccess(
          app,
          request.user.userId,
          request.body.parentOrganizationId,
        );

        if (!parentMembership) {
          return reply.code(403).send({ message: 'Parent organization access denied' });
        }
      }

      const [organization] = await app.prisma.$queryRaw<OrganizationRow[]>`
        SELECT
          id,
          name,
          slug,
          description,
          is_active,
          parent_organization_id,
          logo_url,
          brand_name,
          brand_primary_color,
          brand_secondary_color,
          brand_accent_color,
          session_timeout_minutes,
          created_at,
          updated_at
        FROM organizations
        WHERE id = ${request.params.id}::uuid
          AND deleted_at IS NULL
        LIMIT 1
      `;

      if (!organization) {
        return reply.code(404).send({ message: 'Organization not found' });
      }

      if (request.body.slug && request.body.slug !== organization.slug) {
        const duplicateSlug = await app.prisma.$queryRaw<Array<{ id: string }>>`
          SELECT id
          FROM organizations
          WHERE slug = ${request.body.slug}
            AND id <> ${request.params.id}::uuid
            AND deleted_at IS NULL
          LIMIT 1
        `;

        if (duplicateSlug.length > 0) {
          return reply.code(409).send({ message: 'Organization slug already in use' });
        }
      }

      const [updated] = await app.prisma.$queryRaw<OrganizationRow[]>`
        UPDATE organizations
        SET
          name = COALESCE(${request.body.name}, name),
          slug = COALESCE(${request.body.slug}, slug),
          description = COALESCE(${request.body.description ?? null}, description),
          parent_organization_id = COALESCE(
            ${request.body.parentOrganizationId ?? null}::uuid,
            parent_organization_id
          ),
          logo_url = COALESCE(${request.body.logoUrl ?? null}, logo_url),
          brand_name = COALESCE(${request.body.brandName ?? null}, brand_name),
          brand_primary_color = COALESCE(
            ${request.body.brandPrimaryColor ?? null},
            brand_primary_color
          ),
          brand_secondary_color = COALESCE(
            ${request.body.brandSecondaryColor ?? null},
            brand_secondary_color
          ),
          brand_accent_color = COALESCE(
            ${request.body.brandAccentColor ?? null},
            brand_accent_color
          ),
          session_timeout_minutes = COALESCE(
            ${request.body.sessionTimeoutMinutes ?? null},
            session_timeout_minutes
          ),
          updated_at = now()
        WHERE id = ${request.params.id}::uuid
        RETURNING
          id,
          name,
          slug,
          description,
          is_active,
          parent_organization_id,
          logo_url,
          brand_name,
          brand_primary_color,
          brand_secondary_color,
          brand_accent_color,
          session_timeout_minutes,
          created_at,
          updated_at
      `;

      await app.prisma.$executeRaw`
        INSERT INTO user_audit_logs (
          user_id,
          actor_user_id,
          organization_id,
          event_type,
          event_data
        )
        VALUES (
          ${request.user.userId}::uuid,
          ${request.user.userId}::uuid,
          ${request.params.id}::uuid,
          'organization_updated',
          ${JSON.stringify(request.body)}::jsonb
        )
      `;

      return mapOrganizationRow(updated);
    },
  );

  zodApp.get<{ Params: z.infer<typeof organizationParamsSchema> }>(
    '/organizations/:id/scenarios',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['organizations'],
        summary: 'Liste uniquement les scénarios de l organisation ciblée',
        security: [{ bearerAuth: [] }],
        params: organizationParamsSchema,
        response: {
          200: z.array(scenarioSchema),
          403: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const membership = await assertOrganizationAccess(
        app,
        request.user.userId,
        request.params.id,
      );

      if (!membership) {
        return reply.code(403).send({ message: 'Organization access denied' });
      }

      const scenarios = await app.prisma.$queryRaw<ScenarioRow[]>`
        SELECT
          id,
          organization_id,
          code,
          title,
          summary,
          status::text AS status,
          visibility::text AS visibility,
          mode::text AS mode,
          created_at,
          updated_at
        FROM scenarios
        WHERE organization_id = ${request.params.id}::uuid
          AND archived_at IS NULL
        ORDER BY created_at DESC
      `;

      return scenarios.map(mapScenarioRow);
    },
  );

  zodApp.post<{
    Params: z.infer<typeof organizationParamsSchema>;
    Body: z.infer<typeof createScenarioBodySchema>;
  }>(
    '/organizations/:id/scenarios',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['organizations'],
        summary: 'Crée un scénario isolé dans l organisation ciblée',
        security: [{ bearerAuth: [] }],
        params: organizationParamsSchema,
        body: createScenarioBodySchema,
        response: {
          201: scenarioSchema,
          403: z.object({ message: z.string() }),
          409: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const membership = await assertOrganizationAccess(
        app,
        request.user.userId,
        request.params.id,
      );

      if (!membership) {
        return reply.code(403).send({ message: 'Organization access denied' });
      }

      const duplicateCode = await app.prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM scenarios
        WHERE organization_id = ${request.params.id}::uuid
          AND code = ${request.body.code}
          AND archived_at IS NULL
        LIMIT 1
      `;

      if (duplicateCode.length > 0) {
        return reply.code(409).send({ message: 'Scenario code already in use' });
      }

      const scenarioId = createUuid();
      const [scenario] = await app.prisma.$queryRaw<ScenarioRow[]>`
        INSERT INTO scenarios (
          id,
          organization_id,
          crisis_domain_id,
          code,
          title,
          summary,
          status,
          visibility,
          mode,
          default_difficulty,
          created_by_user_id,
          updated_by_user_id
        )
        VALUES (
          ${scenarioId}::uuid,
          ${request.params.id}::uuid,
          ${request.body.crisisDomainId}::uuid,
          ${request.body.code},
          ${request.body.title},
          ${request.body.summary ?? null},
          'draft'::scenario_status,
          ${request.body.visibility}::scenario_visibility,
          ${request.body.mode}::scenario_mode,
          'medium'::difficulty_level,
          ${request.user.userId}::uuid,
          ${request.user.userId}::uuid
        )
        RETURNING
          id,
          organization_id,
          code,
          title,
          summary,
          status::text AS status,
          visibility::text AS visibility,
          mode::text AS mode,
          created_at,
          updated_at
      `;

      await app.prisma.$executeRaw`
        INSERT INTO user_audit_logs (
          user_id,
          actor_user_id,
          organization_id,
          event_type,
          event_data
        )
        VALUES (
          ${request.user.userId}::uuid,
          ${request.user.userId}::uuid,
          ${request.params.id}::uuid,
          'scenario_created',
          jsonb_build_object(
            'scenarioId', ${scenarioId},
            'code', ${request.body.code},
            'title', ${request.body.title}
          )
        )
      `;

      return reply.code(201).send(mapScenarioRow(scenario));
    },
  );

  zodApp.get<{ Params: z.infer<typeof organizationParamsSchema> }>(
    '/organizations/:id/audit-logs',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['organizations'],
        summary: 'Liste uniquement les logs d audit de l organisation ciblée',
        security: [{ bearerAuth: [] }],
        params: organizationParamsSchema,
        response: {
          200: z.array(auditLogSchema),
          403: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const membership = await assertOrganizationAccess(
        app,
        request.user.userId,
        request.params.id,
      );

      if (!membership) {
        return reply.code(403).send({ message: 'Organization access denied' });
      }

      const logs = await app.prisma.$queryRaw<AuditLogRow[]>`
        SELECT
          id,
          organization_id,
          event_type,
          event_data,
          created_at
        FROM user_audit_logs
        WHERE organization_id = ${request.params.id}::uuid
        ORDER BY created_at DESC
        LIMIT 100
      `;

      return logs.map(mapAuditLogRow);
    },
  );
};

export default organizationsRoute;
