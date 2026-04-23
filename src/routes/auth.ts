import {
  AuthProvider,
  MfaChallengeStatus,
  MfaMethodStatus,
  MfaMethodType,
  UserStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod/v4';
import type {
  FastifyPluginAsyncZod,
  ZodTypeProvider,
} from 'fastify-type-provider-zod';
import {
  buildTotpSetup,
  createChallengeExpiry,
  defaultMfaLabel,
  generateEmailCode,
  MFA_CODE_TTL_MINUTES,
  getChallengeStatusFromExpiry,
  hashMfaCode,
  isChallengeExpired,
  mapMfaMethod,
  verifyTotpCode,
} from '../lib/mfa.js';
import {
  MAX_SESSION_TIMEOUT_MINUTES,
  MIN_SESSION_TIMEOUT_MINUTES,
  normalizeSessionTimeoutMinutes,
  resolveUserSessionTimeoutMinutes,
} from '../lib/session-policy.js';
import {
  createSessionExpiry,
  getRequestDeviceId,
  getRequestIp,
  getRequestUserAgent,
  hashSessionSecret,
} from '../lib/session-security.js';
import {
  createUuid,
  mapUserResponse,
  normalizePersonName,
} from '../lib/user-mapper.js';

const registerBodySchema = z
  .object({
    email: z.email(),
    password: z.string().min(8).max(128),
    name: z.string().min(1).max(150).optional(),
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    displayName: z.string().min(1).max(150).optional(),
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

const loginBodySchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
  preferredMethodType: z.enum(['totp_app', 'email']).optional(),
});

const loginMfaBodySchema = z.object({
  mfaToken: z.uuid(),
  code: z.string().min(6).max(8),
});

const emailSetupBodySchema = z.object({
  email: z.email().optional(),
  label: z.string().min(1).max(100).optional(),
});

const codeBodySchema = z.object({
  code: z.string().min(6).max(8),
});

const disableMfaBodySchema = z.object({
  methodId: z.uuid(),
});

const userStatusSchema = z.enum(['active', 'suspended', 'invited']);

const authUserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  firstName: z.string(),
  lastName: z.string(),
  displayName: z.string().nullable(),
  status: userStatusSchema,
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

const sessionPolicySchema = z.object({
  inactivityTimeoutMinutes: z.number().int(),
  source: z.enum(['default', 'organization']),
  organizationId: z.uuid().nullable(),
  organizationName: z.string().nullable(),
});

const organizationPolicyParamsSchema = z.object({
  id: z.uuid(),
});

const organizationPolicyBodySchema = z.object({
  inactivityTimeoutMinutes: z
    .number()
    .int()
    .min(MIN_SESSION_TIMEOUT_MINUTES)
    .max(MAX_SESSION_TIMEOUT_MINUTES),
});

const mfaMethodSchema = z.object({
  id: z.uuid(),
  methodType: z.enum(['totp_app', 'email']),
  status: z.enum(['pending', 'active', 'disabled']),
  label: z.string().nullable(),
  email: z.string().nullable(),
  isPrimary: z.boolean(),
  verifiedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const loginMfaChallengeSchema = z.object({
  mfaRequired: z.literal(true),
  mfaToken: z.uuid(),
  methodType: z.enum(['totp_app', 'email']),
  expiresAt: z.string().datetime(),
  deliveryPreview: z
    .object({
      destination: z.string().nullable(),
      code: z.string().nullable(),
    })
    .nullable(),
});

const totpSetupSchema = z.object({
  method: mfaMethodSchema,
  secret: z.string(),
  otpauthUrl: z.string(),
  qrCodeDataUrl: z.string(),
});

const emailSetupSchema = z.object({
  method: mfaMethodSchema,
  expiresAt: z.string().datetime(),
  deliveryPreview: z
    .object({
      destination: z.string(),
      code: z.string().nullable(),
    })
    .nullable(),
});

const mfaMethodsResponseSchema = z.object({
  methods: z.array(mfaMethodSchema),
});

type RegisterBody = z.infer<typeof registerBodySchema>;
type LoginBody = z.infer<typeof loginBodySchema>;
type LoginMfaBody = z.infer<typeof loginMfaBodySchema>;
type EmailSetupBody = z.infer<typeof emailSetupBodySchema>;
type CodeBody = z.infer<typeof codeBodySchema>;
type DisableMfaBody = z.infer<typeof disableMfaBodySchema>;

async function issueAccessToken(
  reply: {
    jwtSign: (payload: {
      userId: string;
      email: string;
      sessionId: string;
    }) => Promise<string>;
  },
  user: { id: string; email: string },
  sessionId: string,
) {
  return reply.jwtSign({
    userId: user.id,
    email: user.email,
    sessionId,
  });
}

async function assertNoConcurrentDeviceSession(
  app: FastifyInstance,
  userId: string,
  deviceId: string,
) {
  const activeSession = await app.prisma.userSession.findFirst({
    where: {
      userId,
      revokedAt: null,
      expiresAt: {
        gt: new Date(),
      },
      NOT: {
        deviceId,
      },
    },
    orderBy: {
      lastUsedAt: 'desc',
    },
  });

  if (!activeSession) {
    return null;
  }

  await app.prisma.userSession.update({
    where: { id: activeSession.id },
    data: {
      concurrencyDetectedAt: new Date(),
    },
  });

  return activeSession;
}

async function createAuthenticatedSession(
  app: FastifyInstance,
  request: FastifyRequest,
  user: { id: string; email: string },
  userIdentityId?: string | null,
) {
  const deviceId = getRequestDeviceId(request);
  const conflictingSession = await assertNoConcurrentDeviceSession(app, user.id, deviceId);

  if (conflictingSession) {
    return {
      conflict: true as const,
    };
  }

  await app.prisma.userSession.updateMany({
    where: {
      userId: user.id,
      deviceId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  const sessionId = createUuid();
  const session = await app.prisma.userSession.create({
    data: {
      id: sessionId,
      userId: user.id,
      userIdentityId: userIdentityId ?? null,
      refreshTokenHash: hashSessionSecret(sessionId),
      deviceId,
      ipAddress: getRequestIp(request),
      userAgent: getRequestUserAgent(request),
      expiresAt: createSessionExpiry(),
      lastUsedAt: new Date(),
    },
  });

  return {
    conflict: false as const,
    session,
  };
}

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
          400: authMessageSchema,
          409: authMessageSchema,
          403: authMessageSchema,
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

      const authenticatedSession = await createAuthenticatedSession(
        app,
        request,
        user,
        identityId,
      );

      if (authenticatedSession.conflict) {
        return reply.code(409).send({
          message: 'This account is already active on another device',
        });
      }

      const accessToken = await issueAccessToken(
        reply,
        user,
        authenticatedSession.session.id,
      );

      return reply.code(201).send({
        accessToken,
        user: mapUserResponse(user),
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
          202: loginMfaChallengeSchema,
          401: authMessageSchema,
          403: authMessageSchema,
          409: authMessageSchema,
        },
      },
    },
    async (request, reply) => {
      const identity = await app.prisma.userIdentity.findFirst({
        where: {
          provider: AuthProvider.local,
          user: {
            email: request.body.email,
            deletedAt: null,
          },
        },
        include: {
          user: true,
        },
      });

      if (!identity?.passwordHash) {
        return reply.code(401).send({
          message: 'Invalid credentials',
        });
      }

      const passwordMatches = await bcrypt.compare(
        request.body.password,
        identity.passwordHash,
      );

      if (!passwordMatches) {
        return reply.code(401).send({
          message: 'Invalid credentials',
        });
      }

      if (identity.user.status === UserStatus.suspended) {
        return reply.code(403).send({
          message: 'User account is suspended',
        });
      }

      if (identity.user.status === UserStatus.invited) {
        return reply.code(403).send({
          message: 'User account is invited and must be activated',
        });
      }

      const conflictingSession = await assertNoConcurrentDeviceSession(
        app,
        identity.user.id,
        getRequestDeviceId(request),
      );

      if (conflictingSession) {
        return reply.code(409).send({
          message: 'This account is already active on another device',
        });
      }

      let activeMethods = await app.prisma.userMfaMethod.findMany({
        where: {
          userId: identity.user.id,
          status: MfaMethodStatus.active,
          disabledAt: null,
        },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      });

      if (activeMethods.length === 0) {
        const fallbackMethod = await app.prisma.userMfaMethod.upsert({
          where: {
            userId_methodType_label: {
              userId: identity.user.id,
              methodType: MfaMethodType.email,
              label: defaultMfaLabel(MfaMethodType.email),
            },
          },
          update: {
            email: identity.user.email,
            status: MfaMethodStatus.active,
            disabledAt: null,
            verifiedAt: identity.user.emailVerifiedAt ?? new Date(),
            isPrimary: true,
          },
          create: {
            id: createUuid(),
            userId: identity.user.id,
            methodType: MfaMethodType.email,
            label: defaultMfaLabel(MfaMethodType.email),
            email: identity.user.email,
            status: MfaMethodStatus.active,
            verifiedAt: identity.user.emailVerifiedAt ?? new Date(),
            isPrimary: true,
          },
        });

        activeMethods = [fallbackMethod];
      }

      const method =
        activeMethods.find(
          (item) => item.methodType === request.body.preferredMethodType,
        ) ?? activeMethods[0];

      const challengeId = createUuid();
      const expiresAt = createChallengeExpiry();
      let challengeCodeHash: string | null = null;
      let deliveryPreview: {
        destination: string | null;
        code: string | null;
      } | null = null;

      if (method.methodType === MfaMethodType.email) {
        const code = generateEmailCode();
        challengeCodeHash = hashMfaCode(code);
        await app.mailer.sendMfaCode({
          to: method.email ?? identity.user.email,
          code,
          expiresInMinutes: MFA_CODE_TTL_MINUTES,
        });
        deliveryPreview =
          process.env.NODE_ENV === 'production'
            ? {
                destination: method.email ?? identity.user.email,
                code: null,
              }
            : {
                destination: method.email ?? identity.user.email,
                code,
              };
      }

      await app.prisma.authMfaChallenge.create({
        data: {
          id: challengeId,
          userId: identity.user.id,
          mfaMethodId: method.id,
          challengeCodeHash,
          status: MfaChallengeStatus.pending,
          expiresAt,
        },
      });

      return reply.code(202).send({
        mfaRequired: true,
        mfaToken: challengeId,
        methodType: method.methodType,
        expiresAt: expiresAt.toISOString(),
        deliveryPreview,
      });
    },
  );

  zodApp.post<{ Body: LoginMfaBody }>(
    '/auth/login/mfa',
    {
      schema: {
        tags: ['auth'],
        summary: 'Valide le second facteur et termine la connexion',
        body: loginMfaBodySchema,
        response: {
          200: authSuccessSchema,
          400: authMessageSchema,
          401: authMessageSchema,
          403: authMessageSchema,
          409: authMessageSchema,
        },
      },
    },
    async (request, reply) => {
      const challenge = await app.prisma.authMfaChallenge.findUnique({
        where: { id: request.body.mfaToken },
        include: {
          mfaMethod: true,
          user: true,
        },
      });

      if (!challenge || challenge.cancelledAt) {
        return reply.code(401).send({
          message: 'Invalid MFA challenge',
        });
      }

      const computedStatus = getChallengeStatusFromExpiry(challenge.expiresAt);
      if (
        challenge.status !== MfaChallengeStatus.pending ||
        computedStatus === MfaChallengeStatus.expired
      ) {
        if (computedStatus === MfaChallengeStatus.expired) {
          await app.prisma.authMfaChallenge.update({
            where: { id: challenge.id },
            data: { status: MfaChallengeStatus.expired },
          });
        }

        return reply.code(401).send({
          message: 'MFA challenge expired',
        });
      }

      if (challenge.user.status === UserStatus.suspended) {
        return reply.code(403).send({
          message: 'User account is suspended',
        });
      }

      if (challenge.user.status === UserStatus.invited) {
        return reply.code(403).send({
          message: 'User account is invited and must be activated',
        });
      }

      let isValid = false;
      if (challenge.mfaMethod.methodType === MfaMethodType.totp_app) {
        isValid =
          !!challenge.mfaMethod.secret &&
          verifyTotpCode(challenge.mfaMethod.secret, request.body.code);
      } else if (challenge.challengeCodeHash) {
        isValid = hashMfaCode(request.body.code) === challenge.challengeCodeHash;
      }

      if (!isValid) {
        return reply.code(401).send({
          message: 'Invalid MFA code',
        });
      }

      const now = new Date();
      const user = await app.prisma.$transaction(async (tx) => {
        await tx.authMfaChallenge.update({
          where: { id: challenge.id },
          data: {
            status: MfaChallengeStatus.verified,
            verifiedAt: now,
          },
        });

        await tx.userMfaMethod.update({
          where: { id: challenge.mfaMethod.id },
          data: {
            lastUsedAt: now,
          },
        });

        return tx.user.update({
          where: { id: challenge.user.id },
          data: {
            lastLoginAt: now,
            lastSeenAt: now,
          },
        });
      });

      const localIdentity = await app.prisma.userIdentity.findFirst({
        where: {
          userId: user.id,
          provider: AuthProvider.local,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      const authenticatedSession = await createAuthenticatedSession(
        app,
        request,
        user,
        localIdentity?.id ?? null,
      );

      if (authenticatedSession.conflict) {
        return reply.code(409).send({
          message: 'This account is already active on another device',
        });
      }

      const accessToken = await issueAccessToken(
        reply,
        user,
        authenticatedSession.session.id,
      );

      return {
        accessToken,
        user: mapUserResponse(user),
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

      if (!user || user.deletedAt) {
        return reply.code(404).send({
          message: 'User not found',
        });
      }

      return mapUserResponse(user);
    },
  );

  zodApp.get(
    '/auth/session-policy',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['auth'],
        summary: 'Retourne la politique de timeout d inactivité appliquée à la session',
        security: [{ bearerAuth: [] }],
        response: {
          200: sessionPolicySchema,
        },
      },
    },
    async (request) => {
      return resolveUserSessionTimeoutMinutes(app, request.user.userId);
    },
  );

  zodApp.patch<{
    Params: z.infer<typeof organizationPolicyParamsSchema>;
    Body: z.infer<typeof organizationPolicyBodySchema>;
  }>(
    '/organizations/:id/session-policy',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['organizations'],
        summary: 'Met à jour le timeout d inactivité appliqué par une organisation',
        security: [{ bearerAuth: [] }],
        params: organizationPolicyParamsSchema,
        body: organizationPolicyBodySchema,
        response: {
          200: sessionPolicySchema,
          404: authMessageSchema,
        },
      },
    },
    async (request, reply) => {
      const organizations = await app.prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM organizations
        WHERE id = ${request.params.id}::uuid
          AND deleted_at IS NULL
      `;

      if (organizations.length === 0) {
        return reply.code(404).send({
          message: 'Organization not found',
        });
      }

      await app.prisma.$executeRaw`
        UPDATE organizations
        SET
          session_timeout_minutes = ${normalizeSessionTimeoutMinutes(
            request.body.inactivityTimeoutMinutes,
          )},
          updated_at = now()
        WHERE id = ${request.params.id}::uuid
      `;

      return resolveUserSessionTimeoutMinutes(app, request.user.userId);
    },
  );

  zodApp.post(
    '/auth/logout',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['auth'],
        summary: 'Révoque la session courante',
        security: [{ bearerAuth: [] }],
        response: {
          200: authMessageSchema,
          401: authMessageSchema,
        },
      },
    },
    async (request) => {
      await app.prisma.userSession.update({
        where: { id: request.user.sessionId },
        data: {
          revokedAt: new Date(),
        },
      });

      return {
        message: 'Logged out',
      };
    },
  );

  zodApp.get(
    '/auth/mfa/methods',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['auth'],
        summary: 'Liste les méthodes MFA du profil connecté',
        security: [{ bearerAuth: [] }],
        response: {
          200: mfaMethodsResponseSchema,
        },
      },
    },
    async (request) => {
      const methods = await app.prisma.userMfaMethod.findMany({
        where: {
          userId: request.user.userId,
          disabledAt: null,
        },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      });

      return {
        methods: methods.map(mapMfaMethod),
      };
    },
  );

  zodApp.post(
    '/auth/mfa/totp/setup',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['auth'],
        summary: 'Prépare un setup MFA via application d authentification',
        security: [{ bearerAuth: [] }],
        response: {
          200: totpSetupSchema,
          401: authMessageSchema,
          409: authMessageSchema,
        },
      },
    },
    async (request, reply) => {
      const user = await app.prisma.user.findUnique({
        where: { id: request.user.userId },
      });

      if (!user) {
        return reply.code(401).send({
          message: 'Unauthorized',
        });
      }

      const existingActive = await app.prisma.userMfaMethod.findFirst({
        where: {
          userId: user.id,
          methodType: MfaMethodType.totp_app,
          status: MfaMethodStatus.active,
          disabledAt: null,
        },
      });

      if (existingActive) {
        return reply.code(409).send({
          message: 'TOTP MFA is already enabled',
        });
      }

      const setup = await buildTotpSetup(user);
      const pendingMethod = await app.prisma.userMfaMethod.upsert({
        where: {
          userId_methodType_label: {
            userId: user.id,
            methodType: MfaMethodType.totp_app,
            label: defaultMfaLabel(MfaMethodType.totp_app),
          },
        },
        update: {
          secret: setup.secret,
          status: MfaMethodStatus.pending,
          verifiedAt: null,
          disabledAt: null,
        },
        create: {
          id: createUuid(),
          userId: user.id,
          methodType: MfaMethodType.totp_app,
          label: defaultMfaLabel(MfaMethodType.totp_app),
          secret: setup.secret,
          status: MfaMethodStatus.pending,
        },
      });

      return {
        method: mapMfaMethod(pendingMethod),
        secret: setup.secret,
        otpauthUrl: setup.otpauthUrl,
        qrCodeDataUrl: setup.qrCodeDataUrl,
      };
    },
  );

  zodApp.post<{ Body: CodeBody }>(
    '/auth/mfa/totp/enable',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['auth'],
        summary: 'Active le MFA TOTP après vérification du code',
        security: [{ bearerAuth: [] }],
        body: codeBodySchema,
        response: {
          200: mfaMethodSchema,
          400: authMessageSchema,
          404: authMessageSchema,
        },
      },
    },
    async (request, reply) => {
      const method = await app.prisma.userMfaMethod.findFirst({
        where: {
          userId: request.user.userId,
          methodType: MfaMethodType.totp_app,
          status: MfaMethodStatus.pending,
          disabledAt: null,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      if (!method?.secret) {
        return reply.code(404).send({
          message: 'No pending TOTP setup found',
        });
      }

      if (!verifyTotpCode(method.secret, request.body.code)) {
        return reply.code(400).send({
          message: 'Invalid TOTP code',
        });
      }

      const updated = await app.prisma.userMfaMethod.update({
        where: { id: method.id },
        data: {
          status: MfaMethodStatus.active,
          isPrimary: true,
          verifiedAt: new Date(),
        },
      });

      return mapMfaMethod(updated);
    },
  );

  zodApp.post<{ Body: EmailSetupBody }>(
    '/auth/mfa/email/setup',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['auth'],
        summary: 'Prépare un setup MFA par email',
        security: [{ bearerAuth: [] }],
        body: emailSetupBodySchema,
        response: {
          200: emailSetupSchema,
          400: authMessageSchema,
        },
      },
    },
    async (request, reply) => {
      const email = request.body.email ?? request.user.email;
      if (!email) {
        return reply.code(400).send({
          message: 'Invalid email address',
        });
      }

      const code = generateEmailCode();
      const expiresAt = createChallengeExpiry();
      const label = request.body.label ?? defaultMfaLabel(MfaMethodType.email);

      const method = await app.prisma.$transaction(async (tx) => {
        const upserted = await tx.userMfaMethod.upsert({
          where: {
            userId_methodType_label: {
              userId: request.user.userId,
              methodType: MfaMethodType.email,
              label,
            },
          },
          update: {
            email,
            status: MfaMethodStatus.pending,
            codeHash: hashMfaCode(code),
            codeExpiresAt: expiresAt,
            disabledAt: null,
            verifiedAt: null,
          },
          create: {
            id: createUuid(),
            userId: request.user.userId,
            methodType: MfaMethodType.email,
            label,
            email,
            status: MfaMethodStatus.pending,
            codeHash: hashMfaCode(code),
            codeExpiresAt: expiresAt,
          },
        });

        await tx.user.update({
          where: { id: request.user.userId },
          data: {
            lastSeenAt: new Date(),
          },
        });

        return upserted;
      });

      await app.mailer.sendMfaCode({
        to: email,
        code,
        expiresInMinutes: MFA_CODE_TTL_MINUTES,
      });

      return {
        method: mapMfaMethod(method),
        expiresAt: expiresAt.toISOString(),
        deliveryPreview:
          process.env.NODE_ENV === 'production'
            ? {
                destination: email,
                code: null,
              }
            : {
                destination: email,
                code,
              },
      };
    },
  );

  zodApp.post<{ Body: CodeBody }>(
    '/auth/mfa/email/enable',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['auth'],
        summary: 'Active le MFA email après vérification du code',
        security: [{ bearerAuth: [] }],
        body: codeBodySchema,
        response: {
          200: mfaMethodSchema,
          400: authMessageSchema,
          404: authMessageSchema,
        },
      },
    },
    async (request, reply) => {
      const method = await app.prisma.userMfaMethod.findFirst({
        where: {
          userId: request.user.userId,
          methodType: MfaMethodType.email,
          status: MfaMethodStatus.pending,
          disabledAt: null,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      if (!method?.codeHash || !method.codeExpiresAt) {
        return reply.code(404).send({
          message: 'No pending email setup found',
        });
      }

      if (isChallengeExpired(method.codeExpiresAt)) {
        return reply.code(400).send({
          message: 'Email code expired',
        });
      }

      if (hashMfaCode(request.body.code) !== method.codeHash) {
        return reply.code(400).send({
          message: 'Invalid email code',
        });
      }

      const updated = await app.prisma.userMfaMethod.update({
        where: { id: method.id },
        data: {
          status: MfaMethodStatus.active,
          isPrimary: true,
          verifiedAt: new Date(),
          codeHash: null,
          codeExpiresAt: null,
        },
      });

      return mapMfaMethod(updated);
    },
  );

  zodApp.post<{ Body: DisableMfaBody }>(
    '/auth/mfa/disable',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['auth'],
        summary: 'Désactive une méthode MFA',
        security: [{ bearerAuth: [] }],
        body: disableMfaBodySchema,
        response: {
          200: mfaMethodSchema,
          404: authMessageSchema,
        },
      },
    },
    async (request, reply) => {
      const method = await app.prisma.userMfaMethod.findFirst({
        where: {
          id: request.body.methodId,
          userId: request.user.userId,
          disabledAt: null,
        },
      });

      if (!method) {
        return reply.code(404).send({
          message: 'MFA method not found',
        });
      }

      const updated = await app.prisma.userMfaMethod.update({
        where: { id: method.id },
        data: {
          status: MfaMethodStatus.disabled,
          isPrimary: false,
          disabledAt: new Date(),
        },
      });

      return mapMfaMethod(updated);
    },
  );
};

export default authRoutes;
