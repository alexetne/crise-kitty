import type { FastifyInstance } from 'fastify';

export type AccessibleOrganizationRow = {
  membership_id: string;
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  organization_description: string | null;
  organization_is_active: boolean;
  parent_organization_id: string | null;
  logo_url: string | null;
  brand_name: string | null;
  brand_primary_color: string | null;
  brand_secondary_color: string | null;
  brand_accent_color: string | null;
  session_timeout_minutes: number;
  organization_created_at: Date;
  organization_updated_at: Date;
  joined_at: Date;
};

export async function getAccessibleOrganizations(
  app: FastifyInstance,
  userId: string,
) {
  return app.prisma.$queryRaw<AccessibleOrganizationRow[]>`
    SELECT
      om.id AS membership_id,
      om.organization_id,
      om.joined_at,
      o.id AS organization_id,
      o.name AS organization_name,
      o.slug AS organization_slug,
      o.description AS organization_description,
      o.is_active AS organization_is_active,
      o.parent_organization_id,
      o.logo_url,
      o.brand_name,
      o.brand_primary_color,
      o.brand_secondary_color,
      o.brand_accent_color,
      o.session_timeout_minutes,
      o.created_at AS organization_created_at,
      o.updated_at AS organization_updated_at
    FROM organization_members om
    INNER JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = ${userId}::uuid
      AND om.status = 'active'
      AND om.deleted_at IS NULL
      AND o.is_active = true
      AND o.deleted_at IS NULL
    ORDER BY om.joined_at ASC
  `;
}

export async function assertOrganizationAccess(
  app: FastifyInstance,
  userId: string,
  organizationId: string,
) {
  const memberships = await app.prisma.$queryRaw<AccessibleOrganizationRow[]>`
    SELECT
      om.id AS membership_id,
      om.organization_id,
      om.joined_at,
      o.id AS organization_id,
      o.name AS organization_name,
      o.slug AS organization_slug,
      o.description AS organization_description,
      o.is_active AS organization_is_active,
      o.parent_organization_id,
      o.logo_url,
      o.brand_name,
      o.brand_primary_color,
      o.brand_secondary_color,
      o.brand_accent_color,
      o.session_timeout_minutes,
      o.created_at AS organization_created_at,
      o.updated_at AS organization_updated_at
    FROM organization_members om
    INNER JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = ${userId}::uuid
      AND om.organization_id = ${organizationId}::uuid
      AND om.status = 'active'
      AND om.deleted_at IS NULL
      AND o.is_active = true
      AND o.deleted_at IS NULL
    LIMIT 1
  `;

  return memberships[0] ?? null;
}
