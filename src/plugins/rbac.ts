import fp from 'fastify-plugin';
import type { FastifyReply, FastifyRequest } from 'fastify';

type PermissionCode = string;

declare module 'fastify' {
  interface FastifyInstance {
    getRequestPermissions: (request: FastifyRequest) => Promise<Set<PermissionCode>>;
    requireAnyPermission: (
      required: PermissionCode | PermissionCode[],
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    rbacPermissions?: Set<PermissionCode>;
  }
}

export default fp(async (app) => {
  async function computePermissionsForRequest(request: FastifyRequest) {
    const userId = request.user?.userId;
    const sessionId = request.user?.sessionId;

    if (!userId) {
      return new Set<PermissionCode>();
    }

    const globalRoles = await app.prisma.userGlobalRole.findMany({
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

    const permissions = new Set<PermissionCode>();
    for (const assignment of globalRoles) {
      for (const rp of assignment.role.permissions) {
        permissions.add(rp.permission.code);
      }
    }

    if (!sessionId) {
      return permissions;
    }

    const session = await app.prisma.userSession.findUnique({
      where: { id: sessionId },
      select: { activeOrganizationId: true },
    });

    if (!session?.activeOrganizationId) {
      return permissions;
    }

    const membership = await app.prisma.organizationMember.findFirst({
      where: {
        userId,
        organizationId: session.activeOrganizationId,
        deletedAt: null,
      },
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

    if (!membership) {
      return permissions;
    }

    for (const memberRole of membership.roles) {
      for (const rp of memberRole.role.permissions) {
        permissions.add(rp.permission.code);
      }
    }

    return permissions;
  }

  app.decorate('getRequestPermissions', async (request) => {
    if (request.rbacPermissions) {
      return request.rbacPermissions;
    }

    const permissions = await computePermissionsForRequest(request);
    request.rbacPermissions = permissions;
    return permissions;
  });

  app.decorate('requireAnyPermission', (required) => {
    const requiredList = Array.isArray(required) ? required : [required];

    return async (request, reply) => {
      const permissions = await app.getRequestPermissions(request);

      if (requiredList.some((code) => permissions.has(code))) {
        return;
      }

      await reply.code(403).send({ message: 'Forbidden' });
    };
  });
});

