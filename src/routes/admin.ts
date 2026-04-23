import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function adminRoutes(fastify: FastifyInstance) {
  // GET /admin/stats - Admin statistics
  fastify.get('/admin/stats', async (request, reply) => {
    try {
      // Require super_admin role
      const userId = request.user?.id;
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const [
        totalOrganizations,
        totalUsers,
        activeSessions,
        totalScenarios,
      ] = await Promise.all([
        prisma.organization.count({ where: { deletedAt: null } }),
        prisma.user.count({ where: { deletedAt: null } }),
        prisma.userSession.count({ where: { revokedAt: null } }),
        prisma.scenario.count({ where: { deletedAt: null } }),
      ]);

      return {
        totalOrganizations,
        totalUsers,
        activeSessions,
        totalScenarios,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // GET /admin/roles - Get all roles
  fastify.get('/admin/roles', async (request, reply) => {
    try {
      const roles = await prisma.role.findMany({
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
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // GET /admin/roles/:id - Get role details
  fastify.get('/admin/roles/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const role = await prisma.role.findUnique({
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
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // GET /admin/organizations - Get all organizations
  fastify.get('/admin/organizations', async (request, reply) => {
    try {
      const organizations = await prisma.organization.findMany({
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
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // GET /admin/organizations/:id - Get organization details
  fastify.get('/admin/organizations/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const organization = await prisma.organization.findUnique({
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
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // GET /admin/users - Get all users
  fastify.get('/admin/users', async (request, reply) => {
    try {
      const users = await prisma.user.findMany({
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
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // POST /admin/roles - Create new role
  fastify.post<{ Body: any }>(
    '/admin/roles',
    {
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
        const { code, name, scope, description, permissionIds = [] } = request.body;

        // Check if role code already exists
        const existingRole = await prisma.role.findUnique({
          where: { code },
        });

        if (existingRole) {
          return reply.status(400).send({ error: 'Role code already exists' });
        }

        const role = await prisma.role.create({
          data: {
            code,
            name,
            scope: scope as any,
            description,
            permissions: {
              create: permissionIds.map((permissionId: string) => ({
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
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );
}
