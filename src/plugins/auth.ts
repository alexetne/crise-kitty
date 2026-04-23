import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { UserStatus } from '@prisma/client';
import { getRequestDeviceId, isExpired } from '../lib/session-security.js';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: {
      userId: string;
      email: string;
      sessionId: string;
    };
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(async (app) => {
  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET ?? 'change-me-in-production',
  });

  app.decorate('authenticate', async (request, reply) => {
    try {
      await request.jwtVerify();

      const user = await app.prisma.user.findUnique({
        where: { id: request.user.userId },
      });
      const session = await app.prisma.userSession.findUnique({
        where: { id: request.user.sessionId },
      });

      if (!user || user.deletedAt || !session || session.userId !== user.id) {
        await reply.code(401).send({
          message: 'Unauthorized',
        });
        return;
      }

      if (session.revokedAt || isExpired(session.expiresAt)) {
        await reply.code(401).send({
          message: 'Session expired',
        });
        return;
      }

      if (session.deviceId && session.deviceId !== getRequestDeviceId(request)) {
        await reply.code(409).send({
          message: 'This account is already active on another device',
        });
        return;
      }

      if (user.status === UserStatus.suspended) {
        await reply.code(403).send({
          message: 'User account is suspended',
        });
        return;
      }

      if (user.status === UserStatus.invited) {
        await reply.code(403).send({
          message: 'User account is invited and must be activated',
        });
        return;
      }

      await app.prisma.userSession.update({
        where: { id: session.id },
        data: {
          lastUsedAt: new Date(),
        },
      });
    } catch {
      await reply.code(401).send({
        message: 'Unauthorized',
      });
    }
  });
});
