import { AuthProvider, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod/v4';
import type {
  FastifyPluginAsyncZod,
  ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { createUuid, mapUserResponse, normalizePersonName } from '../lib/user-mapper.js';

const userStatusSchema = z.enum(['active', 'suspended', 'invited']);

export const createUserSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8).max(128),
    name: z.string().min(1).max(150).optional(),
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    displayName: z.string().min(1).max(150).optional(),
    status: userStatusSchema.optional().default('active'),
  })
  .superRefine((value, ctx) => {
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
  status: userStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const listUsersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: userStatusSchema.optional(),
});

const updateUserStatusSchema = z.object({
  status: userStatusSchema,
});

const userParamsSchema = z.object({
  id: z.uuid(),
});

type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
type UpdateUserStatusBody = z.infer<typeof updateUserStatusSchema>;

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
          ...(request.query.status ? { status: request.query.status } : {}),
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
            status: request.body.status
              ? UserStatus[request.body.status]
              : UserStatus.active,
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

  zodApp.patch<{ Params: z.infer<typeof userParamsSchema>; Body: UpdateUserStatusBody }>(
    '/users/:id/status',
    {
      schema: {
        tags: ['users'],
        summary: 'Met à jour le statut d un utilisateur',
        params: userParamsSchema,
        body: updateUserStatusSchema,
        response: {
          200: userResponseSchema,
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const existingUser = await app.prisma.user.findFirst({
        where: {
          id: request.params.id,
          deletedAt: null,
        },
      });

      if (!existingUser) {
        return reply.code(404).send({
          message: 'User not found',
        });
      }

      const updatedUser = await app.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          status: UserStatus[request.body.status],
          lastSeenAt: new Date(),
        },
      });

      return mapUserResponse(updatedUser);
    },
  );
};

export default usersRoute;
