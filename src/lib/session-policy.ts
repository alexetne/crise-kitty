import type { FastifyInstance } from 'fastify';

export const DEFAULT_SESSION_TIMEOUT_MINUTES = 30;
export const MIN_SESSION_TIMEOUT_MINUTES = 5;
export const MAX_SESSION_TIMEOUT_MINUTES = 480;

export function normalizeSessionTimeoutMinutes(value: number | null | undefined) {
  if (!value || Number.isNaN(value)) {
    return DEFAULT_SESSION_TIMEOUT_MINUTES;
  }

  return Math.min(
    MAX_SESSION_TIMEOUT_MINUTES,
    Math.max(MIN_SESSION_TIMEOUT_MINUTES, Math.trunc(value)),
  );
}

export async function resolveUserSessionTimeoutMinutes(
  app: FastifyInstance,
  userId: string,
) {
  const memberships = await app.prisma.$queryRaw<
    Array<{
      organization_id: string;
      organization_name: string;
      session_timeout_minutes: number;
    }>
  >`
    SELECT
      o.id AS organization_id,
      o.name AS organization_name,
      o.session_timeout_minutes
    FROM organization_members om
    INNER JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = ${userId}::uuid
      AND om.status = 'active'
      AND om.deleted_at IS NULL
      AND o.is_active = true
      AND o.deleted_at IS NULL
  `;

  if (memberships.length === 0) {
    return {
      inactivityTimeoutMinutes: DEFAULT_SESSION_TIMEOUT_MINUTES,
      source: 'default' as const,
      organizationId: null,
      organizationName: null,
    };
  }

  const selectedMembership = memberships.reduce((current, candidate) => {
    const currentTimeout = normalizeSessionTimeoutMinutes(
      current.session_timeout_minutes,
    );
    const candidateTimeout = normalizeSessionTimeoutMinutes(
      candidate.session_timeout_minutes,
    );

    return candidateTimeout < currentTimeout ? candidate : current;
  });

  return {
    inactivityTimeoutMinutes: normalizeSessionTimeoutMinutes(
      selectedMembership.session_timeout_minutes,
    ),
    source: 'organization' as const,
    organizationId: selectedMembership.organization_id,
    organizationName: selectedMembership.organization_name,
  };
}

export function isSessionInactive(
  lastUsedAt: Date | null | undefined,
  inactivityTimeoutMinutes: number,
) {
  if (!lastUsedAt) {
    return false;
  }

  return (
    Date.now() - lastUsedAt.getTime() >
    normalizeSessionTimeoutMinutes(inactivityTimeoutMinutes) * 60 * 1000
  );
}
