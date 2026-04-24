import type { FastifyPluginAsync } from 'fastify';
import { createUuid } from '../lib/user-mapper.js';

const adminRoutes: FastifyPluginAsync = async (app) => {
  const requirePlatformAccess = app.requireAnyPermission([
    'view_platform',
    'manage_organizations',
    'manage_roles',
    'manage_billing',
    'view_audit_logs',
  ]);

  // GET /admin/stats - Admin statistics
  app.get(
    '/admin/stats',
    { onRequest: [app.authenticate, requirePlatformAccess] },
    async (request, reply) => {
      try {
        const userId = request.user?.userId;
        if (!userId) {
          return reply.status(401).send({ error: 'Unauthorized' });
        }

        const [
          totalOrganizations,
          totalUsers,
          activeSessions,
          totalScenarios,
        ] = await Promise.all([
          app.prisma.organization.count({ where: { deletedAt: null } }),
          app.prisma.user.count({ where: { deletedAt: null } }),
          app.prisma.userSession.count({ where: { revokedAt: null } }),
          app.prisma.scenario.count({ where: { archivedAt: null } }),
        ]);

        return {
          totalOrganizations,
          totalUsers,
          activeSessions,
          totalScenarios,
        };
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    },
  );

  // GET /admin/roles - Get all roles
  app.get(
    '/admin/roles',
    { onRequest: [app.authenticate, app.requireAnyPermission('manage_roles')] },
    async (request, reply) => {
      try {
        const roles = await app.prisma.role.findMany({
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
          orderBy: [{ scope: 'asc' }, { name: 'asc' }],
        });

        return roles.map((role) => ({
          id: role.id,
          code: role.code,
          name: role.name,
          scope: role.scope,
          description: role.description,
          isSystem: role.isSystem,
          permissionCount: role.permissions.length,
        }));
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    },
  );

  // GET /admin/roles/:id - Get role details
  app.get(
    '/admin/roles/:id',
    { onRequest: [app.authenticate, app.requireAnyPermission('manage_roles')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        const role = await app.prisma.role.findUnique({
          where: { id },
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        });

        if (!role) {
          return reply.status(404).send({ error: 'Role not found' });
        }

        return {
          id: role.id,
          code: role.code,
          name: role.name,
          scope: role.scope,
          description: role.description,
          isSystem: role.isSystem,
          permissions: role.permissions.map((rp) => ({
            id: rp.permission.id,
            code: rp.permission.code,
            name: rp.permission.name,
            resource: rp.permission.resource,
            action: rp.permission.action,
          })),
        };
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    },
  );

  // GET /admin/organizations - Get all organizations
  app.get(
    '/admin/organizations',
    { onRequest: [app.authenticate, app.requireAnyPermission('manage_organizations')] },
    async (request, reply) => {
      try {
        const organizations = await app.prisma.organization.findMany({
          where: { deletedAt: null },
          include: {
            members: {
              where: { deletedAt: null },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        return organizations.map((org) => ({
          id: org.id,
          name: org.name,
          slug: org.slug,
          description: org.description,
          isActive: org.isActive,
          memberCount: org.members.length,
          brandName: org.brandName,
          createdAt: org.createdAt,
        }));
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    },
  );

  // GET /admin/organizations/:id - Get organization details
  app.get(
    '/admin/organizations/:id',
    { onRequest: [app.authenticate, app.requireAnyPermission('manage_organizations')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        const organization = await app.prisma.organization.findUnique({
          where: { id },
          include: {
            members: {
              where: { deletedAt: null },
              include: {
                user: true,
                roles: {
                  include: {
                    role: true,
                  },
                },
              },
            },
            childOrganizations: true,
            parentOrganization: true,
          },
        });

        if (!organization) {
          return reply.status(404).send({ error: 'Organization not found' });
        }

        return {
          ...organization,
          members: organization.members.map((member) => ({
            id: member.id,
            userId: member.userId,
            userName: `${member.user.firstName} ${member.user.lastName}`,
            userEmail: member.user.email,
            jobTitle: member.jobTitle,
            department: member.department,
            status: member.status,
            roles: member.roles.map((r) => r.role.name),
            joinedAt: member.joinedAt,
          })),
        };
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    },
  );

  // GET /admin/users - Get all users
  app.get(
    '/admin/users',
    { onRequest: [app.authenticate, app.requireAnyPermission('manage_roles')] },
    async (request, reply) => {
      try {
        const users = await app.prisma.user.findMany({
          where: { deletedAt: null },
          include: {
            globalRoles: {
              include: {
                role: true,
              },
            },
            organizationMembers: {
              include: {
                organization: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        return users.map((user) => ({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          status: user.status,
          globalRoles: user.globalRoles.map((gr) => gr.role.name),
          organizations: user.organizationMembers.map((om) => om.organization.name),
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
        }));
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    },
  );

  // POST /admin/roles - Create new role
  app.post<{ Body: any }>(
    '/admin/roles',
    {
      onRequest: [app.authenticate, app.requireAnyPermission('manage_roles')],
      schema: {
        body: {
          type: 'object',
          required: ['code', 'name', 'scope'],
          properties: {
            code: { type: 'string' },
            name: { type: 'string' },
            scope: { type: 'string', enum: ['global', 'organization'] },
            description: { type: 'string' },
            permissionIds: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const body = request.body as {
          code: string;
          name: string;
          scope: 'global' | 'organization';
          description?: string;
          permissionIds?: string[];
        };
        const { code, name, scope, description } = body;
        const permissionIds = body.permissionIds ?? [];

        // Check if role code already exists
        const existingRole = await app.prisma.role.findUnique({
          where: { code },
        });

        if (existingRole) {
          return reply.status(400).send({ error: 'Role code already exists' });
        }

        const role = await app.prisma.role.create({
          data: {
            id: createUuid(),
            code,
            name,
            scope: scope as any,
            description,
            permissions: {
              create: permissionIds.map((permissionId) => ({
                permission: {
                  connect: { id: permissionId },
                },
              })),
            },
          },
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        });

        return reply.status(201).send(role);
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );
};

export default adminRoutes;
