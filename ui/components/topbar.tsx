'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
import { getToken, logout } from '../lib/auth';

type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
  parentOrganizationId: string | null;
  logoUrl: string | null;
  brandName: string | null;
  brandPrimaryColor: string | null;
  brandSecondaryColor: string | null;
  brandAccentColor: string | null;
  sessionTimeoutMinutes: number;
};

type OrganizationContext = {
  activeOrganizationId: string | null;
  organizations: OrganizationSummary[];
};

export function Topbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [organizationContext, setOrganizationContext] =
    useState<OrganizationContext | null>(null);

  const activeOrganization = organizationContext?.organizations.find(
    (organization) => organization.id === organizationContext.activeOrganizationId,
  );

  useEffect(() => {
    const token = getToken();
    setIsLoggedIn(Boolean(token));

    if (!token) {
      setOrganizationContext(null);
      return;
    }

    void apiRequest<OrganizationContext>('/auth/organization-context', { token })
      .then((payload) => {
        setOrganizationContext(payload);

        const root = document.documentElement;
        root.style.setProperty(
          '--accent',
          payload.organizations.find((organization) => organization.id === payload.activeOrganizationId)?.brandPrimaryColor ??
            '#d95f2b',
        );
        root.style.setProperty(
          '--accent-2',
          payload.organizations.find((organization) => organization.id === payload.activeOrganizationId)?.brandSecondaryColor ??
            '#1f6b5b',
        );
      })
      .catch(() => {
        setOrganizationContext(null);
      });
  }, []);

  return (
    <header className="topbar">
      <Link href="/" className="brand">
        <span className="brand-mark">
          {activeOrganization?.logoUrl ? (
            <img alt="" src={activeOrganization.logoUrl} className="brand-logo" />
          ) : (
            'CK'
          )}
        </span>
        <span>{activeOrganization?.brandName ?? 'Crise Kitty'}</span>
      </Link>

      <nav className="nav">
        <Link href="/">Accueil</Link>
        <Link href="/register">Register</Link>
        <Link href="/login">Login</Link>
        <Link href="/profile">Profile</Link>
        <Link href="/simulation">Simulation</Link>
        {isLoggedIn && (
          <Link href="/admin" className="admin-link">
            Admin
          </Link>
        )}
        {isLoggedIn && organizationContext?.organizations.length ? (
          <select
            aria-label="Organisation active"
            value={organizationContext.activeOrganizationId ?? ''}
            onChange={(event) => {
              const token = getToken();
              if (!token) {
                return;
              }

              void apiRequest<OrganizationContext>('/auth/active-organization', {
                method: 'POST',
                token,
                body: {
                  organizationId: event.target.value,
                },
              }).then((payload) => {
                setOrganizationContext(payload);

                const active = payload.organizations.find(
                  (organization) => organization.id === payload.activeOrganizationId,
                );
                const root = document.documentElement;
                root.style.setProperty('--accent', active?.brandPrimaryColor ?? '#d95f2b');
                root.style.setProperty('--accent-2', active?.brandSecondaryColor ?? '#1f6b5b');
              });
            }}
          >
            {organizationContext.organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
        ) : null}
        {isLoggedIn ? (
          <button
            type="button"
            onClick={() => {
              void logout().finally(() => {
              setIsLoggedIn(false);
              });
            }}
          >
            Logout
          </button>
        ) : null}
      </nav>
    </header>
  );
}
