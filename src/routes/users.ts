import { AuthProvider, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod/v4';
import type {
  FastifyPluginAsyncZod,
  ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { createUuid, mapUserResponse, normalizePersonName } from '../lib/user-mapper.js';

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(150).optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  displayName: z.string().min(1).max(150).optional(),
}).superRefine((value, ctx) => {
  const normalized = normalizePersonName(value);
  if (!normalized) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['name'],
      message: 'Provide either name or firstName and lastName.',
    });
  }
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

const userResponseSchema = z.object({
  id: z.uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  displayName: z.string().nullable(),
  status: z.enum(['active', 'suspended', 'disabled', 'archived']),
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
        where: {
          deletedAt: null,
        },
        take: request.query.limit,
        orderBy: {
          createdAt: 'desc',
        },
      });

      return users.map(mapUserResponse);
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
      const existingUser = await app.prisma.user.findFirst({
        where: {
          email: request.body.email,
          deletedAt: null,
        },
      });

      if (existingUser) {
        return reply.code(409).send({
          message: 'Email already in use',
        });
      }

      const normalizedName = normalizePersonName(request.body);
      if (!normalizedName) {
        return reply.code(400).send({
          message: 'Missing name information',
        });
      }

      const passwordHash = await bcrypt.hash(request.body.password, 12);
      const userId = createUuid();
      const identityId = createUuid();

      const user = await app.prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            id: userId,
            email: request.body.email,
            firstName: normalizedName.firstName,
            lastName: normalizedName.lastName,
            displayName: normalizedName.displayName,
            status: UserStatus.active,
            lastSeenAt: new Date(),
          },
        });

        await tx.userIdentity.create({
          data: {
            id: identityId,
            userId: createdUser.id,
            provider: AuthProvider.local,
            providerUserId: createdUser.email,
            passwordHash,
            isPrimary: true,
          },
        });

        return createdUser;
      });

      return reply.code(201).send(mapUserResponse(user));
    },
  );
};

export default usersRoute;
