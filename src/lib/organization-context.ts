import type { FastifyInstance } from 'fastify';

export async function getAccessibleOrganizations(
  app: FastifyInstance,
  userId: string,
) {
  return app.prisma.organizationMember.findMany({
    where: {
      userId,
      status: 'active',
      deletedAt: null,
      organization: {
        isActive: true,
        deletedAt: null,
      },
    },
    include: {
      organization: true,
    },
    orderBy: {
      joinedAt: 'asc',
    },
  });
}

export async function assertOrganizationAccess(
  app: FastifyInstance,
  userId: string,
  organizationId: string,
) {
  const membership = await app.prisma.organizationMember.findFirst({
    where: {
      userId,
      organizationId,
      status: 'active',
      deletedAt: null,
      organization: {
        isActive: true,
        deletedAt: null,
      },
    },
    include: {
      organization: true,
    },
  });

  return membership;
}
