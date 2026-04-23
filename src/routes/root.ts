import { z } from 'zod/v4';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

const rootRoute: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/',
    {
      schema: {
        tags: ['root'],
        summary: 'Page racine de l API',
        response: {
          200: z.object({
            name: z.string(),
            status: z.string(),
            docs: z.string(),
            health: z.string(),
          }),
        },
      },
    },
    async () => {
      return {
        name: 'Crise Kitty API',
        status: 'ok',
        docs: '/docs',
        health: '/health',
      };
    },
  );
};

export default rootRoute;
