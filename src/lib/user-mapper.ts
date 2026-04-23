import { randomUUID } from 'node:crypto';

import type { User } from '@prisma/client';

export function createUuid() {
  return randomUUID();
}

export function normalizePersonName(input: {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  name?: string;
}) {
  const firstName = input.firstName?.trim();
  const lastName = input.lastName?.trim();
  const displayName = input.displayName?.trim();
  const fullName = input.name?.trim();

  if (firstName && lastName) {
    return {
      firstName,
      lastName,
      displayName: displayName || `${firstName} ${lastName}`,
    };
  }

  if (!fullName) {
    return null;
  }

  const parts = fullName.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return {
      firstName: parts[0],
      lastName: parts[0],
      displayName: displayName || parts[0],
    };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
    displayName: displayName || fullName,
  };
}

export function mapUserResponse(user: User) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    displayName: user.displayName,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
