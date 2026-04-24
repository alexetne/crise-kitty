'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Topbar } from '@/components/topbar';
import { apiRequest } from '@/lib/api';
import { getToken } from '@/lib/auth';

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

type HubCard = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: string;
  show: boolean;
};

export default function HubPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [orgContext, setOrgContext] = useState<OrganizationContext | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    void Promise.all([
      apiRequest<OrganizationContext>('/auth/organization-context', { token }),
      apiRequest<{ permissions: string[] }>('/auth/permissions', { token }),
    ])
      .then(([contextPayload, permissionsPayload]) => {
        setOrgContext(contextPayload);
        setPermissions(permissionsPayload.permissions ?? []);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const canAccessPlatform =
    permissions.includes('view_platform') ||
    permissions.includes('manage_organizations') ||
    permissions.includes('manage_roles') ||
    permissions.includes('manage_billing') ||
    permissions.includes('view_audit_logs');

  const canAccessSimulation =
    permissions.includes('view_sessions') ||
    permissions.includes('manage_session') ||
    permissions.includes('create_session');

  const canAccessOrganization =
    permissions.includes('view_organization') ||
    permissions.includes('manage_org_profile') ||
    permissions.includes('manage_org_members') ||
    permissions.includes('manage_org_roles');

  const activeOrganization = useMemo(() => {
    if (!orgContext?.activeOrganizationId) return null;
    return (
      orgContext.organizations.find((org) => org.id === orgContext.activeOrganizationId) ??
      null
    );
  }, [orgContext]);

  const cards: HubCard[] = [
    {
      id: 'admin',
      title: 'Plateforme (Admin)',
      description: 'Gestion SaaS: organisations, rôles & permissions, facturation.',
      href: '/admin',
      icon: '🛠️',
      show: canAccessPlatform,
    },
    {
      id: 'organization',
      title: 'Organisation',
      description: 'Profil, marquage blanc, membres et rôles de l’entreprise.',
      href: '/organization',
      icon: '🏢',
      show: canAccessOrganization,
    },
    {
      id: 'simulation',
      title: 'Simulation',
      description: 'Accéder aux interfaces de simulation (session, actions, suivi).',
      href: '/simulation',
      icon: '🎭',
      show: canAccessSimulation,
    },
    {
      id: 'profile',
      title: 'Compte',
      description: 'Profil utilisateur et préférences.',
      href: '/profile',
      icon: '👤',
      show: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Topbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Accès</h1>
          <p className="text-lg text-gray-600">
            Modes disponibles selon tes permissions RBAC (Plateforme vs Simulation).
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Contexte</h2>
          {loading ? (
            <p className="text-gray-600">Chargement...</p>
          ) : activeOrganization ? (
            <div className="text-sm text-gray-700">
              Organisation active : <strong>{activeOrganization.name}</strong> ({activeOrganization.slug})
            </div>
          ) : (
            <p className="text-gray-600">
              Aucune organisation active (ou aucune organisation accessible).
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cards
            .filter((card) => card.show)
            .map((card) => (
              <Link
                key={card.id}
                href={card.href}
                className="bg-white rounded-lg shadow p-6 transition-all duration-200 hover:shadow-lg hover:scale-[1.01]"
              >
                <div className="text-4xl mb-4">{card.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{card.title}</h3>
                <p className="text-gray-600">{card.description}</p>
                <div className="mt-4 text-sm font-medium text-blue-600">Accéder →</div>
              </Link>
            ))}
        </div>

        <div className="mt-10 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-2">Rappels RBAC</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Plateforme: rôles globaux et fonctions SaaS (ex: `view_platform`, `manage_roles`).</li>
            <li>• Simulation: fonctions de crise/sessions (ex: `view_sessions`, `trigger_injections`).</li>
            <li>• Organisation: profil, membres et accès internes (ex: `manage_org_profile`).</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

