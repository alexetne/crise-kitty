import type { FastifyPluginAsync } from 'fastify';

const authPermissionsRoute: FastifyPluginAsync = async (app) => {
  // GET /auth/permissions - Get current user permissions
  app.get('/auth/permissions', { onRequest: [app.authenticate] }, async (request, reply) => {
    try {
      const permissions = await app.getRequestPermissions(request);
      return { permissions: Array.from(permissions) };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default authPermissionsRoute;
