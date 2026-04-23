import bcrypt from 'bcryptjs';
import { z } from 'zod/v4';
import type {
  FastifyPluginAsyncZod,
  ZodTypeProvider,
} from 'fastify-type-provider-zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(120).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

const userResponseSchema = z.object({
  id: z.number().int(),
  email: z.string().email(),
  name: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const listUsersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

const usersRoute: FastifyPluginAsyncZod = async (app) => {
  const zodApp = app.withTypeProvider<ZodTypeProvider>();

  zodApp.get<{ Querystring: ListUsersQuery }>(
    '/users',
    {
      schema: {
        tags: ['users'],
        summary: 'Liste les utilisateurs',
        querystring: listUsersQuerySchema,
        response: {
          200: z.array(userResponseSchema),
        },
      },
    },
    async (request) => {
      const users = await app.prisma.user.findMany({
        take: request.query.limit,
        orderBy: {
          createdAt: 'desc',
        },
      });

      return users.map((user) => ({
        ...user,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      }));
    },
  );

  zodApp.post<{ Body: CreateUserInput }>(
    '/users',
    {
      schema: {
        tags: ['users'],
        summary: 'Crée un utilisateur',
        body: createUserSchema,
        response: {
          201: userResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const passwordHash = await bcrypt.hash(request.body.password, 12);
      const user = await app.prisma.user.create({
        data: {
          email: request.body.email,
          name: request.body.name,
          passwordHash,
        },
      });

      return reply.code(201).send({
        ...user,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      });
    },
  );
};

export default usersRoute;
