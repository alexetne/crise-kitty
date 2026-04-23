import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { UserStatus } from '@prisma/client';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: {
      userId: string;
      email: string;
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

      if (!user || user.deletedAt) {
        await reply.code(401).send({
          message: 'Unauthorized',
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
    } catch {
      await reply.code(401).send({
        message: 'Unauthorized',
      });
    }
  });
});
