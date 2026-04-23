import { z } from 'zod/v4';
import type {
  FastifyPluginAsyncZod,
  ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { assertOrganizationAccess, getAccessibleOrganizations } from '../lib/organization-context.js';
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

function mapOrganization(organization: {
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
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    description: organization.description,
    isActive: organization.isActive,
    parentOrganizationId: organization.parentOrganizationId,
    logoUrl: organization.logoUrl,
    brandName: organization.brandName,
    brandPrimaryColor: organization.brandPrimaryColor,
    brandSecondaryColor: organization.brandSecondaryColor,
    brandAccentColor: organization.brandAccentColor,
    sessionTimeoutMinutes: organization.sessionTimeoutMinutes,
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString(),
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
      const nodes = memberships.map(({ organization }) => ({
        ...mapOrganization(organization),
        children: [] as Array<ReturnType<typeof mapOrganization> & { children: unknown[] }>,
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

      return {
        organizations: roots,
      };
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
          return reply.code(403).send({
            message: 'Parent organization access denied',
          });
        }
      }

      const existing = await app.prisma.organization.findFirst({
        where: {
          slug: request.body.slug,
          deletedAt: null,
        },
      });

      if (existing) {
        return reply.code(409).send({
          message: 'Organization slug already in use',
        });
      }

      const organization = await app.prisma.organization.create({
        data: {
          id: createUuid(),
          name: request.body.name,
          slug: request.body.slug,
          description: request.body.description,
          parentOrganizationId: request.body.parentOrganizationId,
          logoUrl: request.body.logoUrl,
          brandName: request.body.brandName,
          brandPrimaryColor: request.body.brandPrimaryColor,
          brandSecondaryColor: request.body.brandSecondaryColor,
          brandAccentColor: request.body.brandAccentColor,
          sessionTimeoutMinutes: request.body.sessionTimeoutMinutes ?? 30,
        },
      });

      await app.prisma.organizationMember.create({
        data: {
          id: createUuid(),
          organizationId: organization.id,
          userId: request.user.userId,
          status: 'active',
        },
      });

      await app.prisma.userAuditLog.create({
        data: {
          userId: request.user.userId,
          actorUserId: request.user.userId,
          organizationId: organization.id,
          eventType: 'organization_created',
          eventData: {
            name: organization.name,
            slug: organization.slug,
            parentOrganizationId: organization.parentOrganizationId,
          },
        },
      });

      return reply.code(201).send(mapOrganization(organization));
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
        return reply.code(403).send({
          message: 'Organization access denied',
        });
      }

      if (request.body.parentOrganizationId) {
        const parentMembership = await assertOrganizationAccess(
          app,
          request.user.userId,
          request.body.parentOrganizationId,
        );

        if (!parentMembership) {
          return reply.code(403).send({
            message: 'Parent organization access denied',
          });
        }
      }

      const organization = await app.prisma.organization.findUnique({
        where: { id: request.params.id },
      });

      if (!organization || organization.deletedAt) {
        return reply.code(404).send({
          message: 'Organization not found',
        });
      }

      const updated = await app.prisma.organization.update({
        where: { id: organization.id },
        data: {
          ...(request.body.name !== undefined ? { name: request.body.name } : {}),
          ...(request.body.slug !== undefined ? { slug: request.body.slug } : {}),
          ...(request.body.description !== undefined
            ? { description: request.body.description }
            : {}),
          ...(request.body.parentOrganizationId !== undefined
            ? { parentOrganizationId: request.body.parentOrganizationId }
            : {}),
          ...(request.body.logoUrl !== undefined ? { logoUrl: request.body.logoUrl } : {}),
          ...(request.body.brandName !== undefined
            ? { brandName: request.body.brandName }
            : {}),
          ...(request.body.brandPrimaryColor !== undefined
            ? { brandPrimaryColor: request.body.brandPrimaryColor }
            : {}),
          ...(request.body.brandSecondaryColor !== undefined
            ? { brandSecondaryColor: request.body.brandSecondaryColor }
            : {}),
          ...(request.body.brandAccentColor !== undefined
            ? { brandAccentColor: request.body.brandAccentColor }
            : {}),
          ...(request.body.sessionTimeoutMinutes !== undefined
            ? { sessionTimeoutMinutes: request.body.sessionTimeoutMinutes }
            : {}),
        },
      });

      await app.prisma.userAuditLog.create({
        data: {
          userId: request.user.userId,
          actorUserId: request.user.userId,
          organizationId: updated.id,
          eventType: 'organization_updated',
          eventData: request.body,
        },
      });

      return mapOrganization(updated);
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
        return reply.code(403).send({
          message: 'Organization access denied',
        });
      }

      const scenarios = await app.prisma.scenario.findMany({
        where: {
          organizationId: request.params.id,
          archivedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return scenarios.map((scenario) => ({
        id: scenario.id,
        organizationId: scenario.organizationId ?? null,
        code: scenario.code,
        title: scenario.title,
        summary: scenario.summary ?? null,
        status: scenario.status,
        visibility: scenario.visibility,
        mode: scenario.mode,
        createdAt: scenario.createdAt.toISOString(),
        updatedAt: scenario.updatedAt.toISOString(),
      }));
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
        return reply.code(403).send({
          message: 'Organization access denied',
        });
      }

      const scenario = await app.prisma.scenario.create({
        data: {
          id: createUuid(),
          organizationId: request.params.id,
          crisisDomainId: request.body.crisisDomainId,
          code: request.body.code,
          title: request.body.title,
          summary: request.body.summary,
          status: 'draft',
          visibility: request.body.visibility,
          mode: request.body.mode,
          defaultDifficulty: 'medium',
          createdByUserId: request.user.userId,
          updatedByUserId: request.user.userId,
        },
      });

      await app.prisma.userAuditLog.create({
        data: {
          userId: request.user.userId,
          actorUserId: request.user.userId,
          organizationId: request.params.id,
          eventType: 'scenario_created',
          eventData: {
            scenarioId: scenario.id,
            code: scenario.code,
            title: scenario.title,
          },
        },
      });

      return reply.code(201).send({
        id: scenario.id,
        organizationId: scenario.organizationId ?? null,
        code: scenario.code,
        title: scenario.title,
        summary: scenario.summary ?? null,
        status: scenario.status,
        visibility: scenario.visibility,
        mode: scenario.mode,
        createdAt: scenario.createdAt.toISOString(),
        updatedAt: scenario.updatedAt.toISOString(),
      });
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
        return reply.code(403).send({
          message: 'Organization access denied',
        });
      }

      const logs = await app.prisma.userAuditLog.findMany({
        where: {
          organizationId: request.params.id,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 100,
      });

      return logs.map((log) => ({
        id: log.id.toString(),
        organizationId: log.organizationId ?? null,
        eventType: log.eventType,
        eventData: log.eventData ?? null,
        createdAt: log.createdAt.toISOString(),
      }));
    },
  );
};

export default organizationsRoute;
