import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function authPermissionsRoute(fastify: FastifyInstance) {
  // GET /auth/permissions - Get current user permissions
  fastify.get('/auth/permissions', async (request, reply) => {
    try {
      const userId = request.user?.id;
      if (!userId) {
        return { permissions: [] };
      }

      // Fetch global roles permissions
      const globalRoles = await prisma.userGlobalRole.findMany({
        where: { userId },
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });

      // Fetch organization member roles permissions
      const orgMemberships = await prisma.organizationMember.findMany({
        where: { userId, deletedAt: null },
        include: {
          roles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Collect all unique permissions
      const permissions = new Set<string>();

      globalRoles.forEach((gr) => {
        gr.role.permissions.forEach((rp) => {
          permissions.add(rp.permission.code);
        });
      });

      orgMemberships.forEach((om) => {
        om.roles.forEach((role) => {
          role.role.permissions.forEach((rp) => {
            permissions.add(rp.permission.code);
          });
        });
      });

      return { permissions: Array.from(permissions) };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
