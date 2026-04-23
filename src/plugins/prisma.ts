import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export default fp(async (app) => {
  const prisma = new PrismaClient();

  const maxAttempts = 15;
  const retryDelayMs = 2_000;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await prisma.$connect();
      break;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }

      app.log.warn(
        { attempt, maxAttempts },
        'Prisma connection failed, retrying...',
      );

      await new Promise((resolve) => {
        setTimeout(resolve, retryDelayMs);
      });
    }
  }

  app.decorate('prisma', prisma);

  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
});
