import bcrypt from 'bcryptjs';
import { z } from 'zod/v4';
import type {
  FastifyPluginAsyncZod,
  ZodTypeProvider,
} from 'fastify-type-provider-zod';

const registerBodySchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(120).optional(),
});

const loginBodySchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
});

const authUserSchema = z.object({
  id: z.number().int(),
  email: z.email(),
  name: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const authSuccessSchema = z.object({
  accessToken: z.string(),
  user: authUserSchema,
});

const authMessageSchema = z.object({
  message: z.string(),
});

type RegisterBody = z.infer<typeof registerBodySchema>;
type LoginBody = z.infer<typeof loginBodySchema>;

const authRoutes: FastifyPluginAsyncZod = async (app) => {
  const zodApp = app.withTypeProvider<ZodTypeProvider>();

  zodApp.post<{ Body: RegisterBody }>(
    '/auth/register',
    {
      schema: {
        tags: ['auth'],
        summary: 'Inscrit un utilisateur',
        body: registerBodySchema,
        response: {
          201: authSuccessSchema,
          409: authMessageSchema,
        },
      },
    },
    async (request, reply) => {
      const existingUser = await app.prisma.user.findUnique({
        where: { email: request.body.email },
      });

      if (existingUser) {
        return reply.code(409).send({
          message: 'Email already in use',
        });
      }

      const passwordHash = await bcrypt.hash(request.body.password, 12);
      const user = await app.prisma.user.create({
        data: {
          email: request.body.email,
          name: request.body.name,
          passwordHash,
        },
      });

      const accessToken = await reply.jwtSign({
        userId: user.id,
        email: user.email,
      });

      return reply.code(201).send({
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
      });
    },
  );

  zodApp.post<{ Body: LoginBody }>(
    '/auth/login',
    {
      schema: {
        tags: ['auth'],
        summary: 'Connecte un utilisateur',
        body: loginBodySchema,
        response: {
          200: authSuccessSchema,
          401: authMessageSchema,
        },
      },
    },
    async (request, reply) => {
      const user = await app.prisma.user.findUnique({
        where: { email: request.body.email },
      });

      if (!user) {
        return reply.code(401).send({
          message: 'Invalid credentials',
        });
      }

      const passwordMatches = await bcrypt.compare(
        request.body.password,
        user.passwordHash,
      );

      if (!passwordMatches) {
        return reply.code(401).send({
          message: 'Invalid credentials',
        });
      }

      const accessToken = await reply.jwtSign({
        userId: user.id,
        email: user.email,
      });

      return {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
      };
    },
  );

  zodApp.get(
    '/auth/profile',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['auth'],
        summary: 'Retourne le profil utilisateur connecté',
        security: [{ bearerAuth: [] }],
        response: {
          200: authUserSchema,
          401: authMessageSchema,
          404: authMessageSchema,
        },
      },
    },
    async (request, reply) => {
      const user = await app.prisma.user.findUnique({
        where: { id: request.user.userId },
      });

      if (!user) {
        return reply.code(404).send({
          message: 'User not found',
        });
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    },
  );
};

export default authRoutes;
