import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

const healthRoute: FastifyPluginAsyncZod = async (app) => {
  app.get('/health', async () => {
    return { status: 'ok' };
  });
};

export default healthRoute;
