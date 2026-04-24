import { z } from 'zod/v4';
import type {
  FastifyPluginAsyncZod,
  ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { createUuid } from '../lib/user-mapper.js';

const simulationUiStateSchema = z.object({
  scenarioTitle: z.string().min(1).max(200),
  activePane: z.enum(['timeline', 'decisions', 'communications']),
  phaseLabel: z.string().min(1).max(120),
  currentStep: z.string().min(1).max(160),
  elapsedSeconds: z.int().min(0).max(86_400),
  facilitatorNotes: z.string().max(10_000),
  publicMessageDraft: z.string().max(5_000),
  selectedDecision: z.string().nullable(),
  selectedTags: z.array(z.string().min(1).max(50)).max(12),
  eventLog: z.array(z.string().min(1).max(300)).max(50),
  checklist: z.object({
    authoritiesAlerted: z.boolean(),
    legalReviewed: z.boolean(),
    executiveBriefed: z.boolean(),
    pressHoldingReady: z.boolean(),
  }),
});

const sessionKeySchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9:_-]+$/i);

const sessionQuerySchema = z.object({
  key: sessionKeySchema.default('default'),
});

const sessionBodySchema = z.object({
  sessionKey: sessionKeySchema.default('default'),
  routePath: z.string().min(1).max(255).default('/simulation'),
  state: simulationUiStateSchema,
  clientSavedAt: z.iso.datetime().optional(),
});

const messageSchema = z.object({
  message: z.string(),
});

const simulationSessionSchema = z.object({
  id: z.uuid(),
  sessionKey: z.string(),
  routePath: z.string(),
  state: simulationUiStateSchema,
  version: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastClientSavedAt: z.string().datetime().nullable(),
});

const simulationSessionResponseSchema = z.object({
  session: simulationSessionSchema.nullable(),
});

type SessionQuery = z.infer<typeof sessionQuerySchema>;
type SessionBody = z.infer<typeof sessionBodySchema>;

const simulationRoutes: FastifyPluginAsyncZod = async (app) => {
  const zodApp = app.withTypeProvider<ZodTypeProvider>();

  zodApp.get<{ Querystring: SessionQuery }>(
    '/simulation/session',
    {
      onRequest: [app.authenticate, app.requireAnyPermission('view_sessions')],
      schema: {
        tags: ['simulation'],
        summary: 'Retourne la dernière session d interface de simulation sauvegardée',
        security: [{ bearerAuth: [] }],
        querystring: sessionQuerySchema,
        response: {
          200: simulationSessionResponseSchema,
        },
      },
    },
    async (request) => {
      const session = await app.prisma.simulationUiSession.findUnique({
        where: {
          userId_sessionKey: {
            userId: request.user.userId,
            sessionKey: request.query.key,
          },
        },
      });

      if (!session) {
        return { session: null };
      }

      return {
        session: {
          id: session.id,
          sessionKey: session.sessionKey,
          routePath: session.routePath,
          state: simulationUiStateSchema.parse(session.state),
          version: session.version,
          createdAt: session.createdAt.toISOString(),
          updatedAt: session.updatedAt.toISOString(),
          lastClientSavedAt: session.lastClientSavedAt?.toISOString() ?? null,
        },
      };
    },
  );

  zodApp.put<{ Body: SessionBody }>(
    '/simulation/session',
    {
      onRequest: [app.authenticate, app.requireAnyPermission('view_sessions')],
      schema: {
        tags: ['simulation'],
        summary: 'Sauvegarde l état courant de l interface de simulation',
        security: [{ bearerAuth: [] }],
        body: sessionBodySchema,
        response: {
          200: simulationSessionResponseSchema,
          400: messageSchema,
        },
      },
    },
    async (request) => {
      const session = await app.prisma.simulationUiSession.upsert({
        where: {
          userId_sessionKey: {
            userId: request.user.userId,
            sessionKey: request.body.sessionKey,
          },
        },
        update: {
          routePath: request.body.routePath,
          state: request.body.state,
          version: {
            increment: 1,
          },
          lastClientSavedAt: request.body.clientSavedAt
            ? new Date(request.body.clientSavedAt)
            : null,
        },
        create: {
          id: createUuid(),
          userId: request.user.userId,
          sessionKey: request.body.sessionKey,
          routePath: request.body.routePath,
          state: request.body.state,
          lastClientSavedAt: request.body.clientSavedAt
            ? new Date(request.body.clientSavedAt)
            : null,
        },
      });

      return {
        session: {
          id: session.id,
          sessionKey: session.sessionKey,
          routePath: session.routePath,
          state: simulationUiStateSchema.parse(session.state),
          version: session.version,
          createdAt: session.createdAt.toISOString(),
          updatedAt: session.updatedAt.toISOString(),
          lastClientSavedAt: session.lastClientSavedAt?.toISOString() ?? null,
        },
      };
    },
  );
};

export default simulationRoutes;
