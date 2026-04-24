'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Topbar } from '@/components/topbar';
import { apiRequest } from '@/lib/api';
import { getToken } from '@/lib/auth';

type OrganizationContext = {
  activeOrganizationId: string | null;
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
};

type OrganizationProfile = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  parentOrganizationId: string | null;
  logoUrl: string | null;
  brandName: string | null;
  brandPrimaryColor: string | null;
  brandSecondaryColor: string | null;
  brandAccentColor: string | null;
  sessionTimeoutMinutes: number;
  createdAt: string;
  updatedAt: string;
};

export default function OrganizationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [orgContext, setOrgContext] = useState<OrganizationContext | null>(null);
  const [org, setOrg] = useState<OrganizationProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<OrganizationProfile>>({});

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
      .catch((caughtError) => {
        setError(caughtError instanceof Error ? caughtError.message : 'Erreur');
      });
  }, []);

  const activeOrganizationId = orgContext?.activeOrganizationId ?? null;

  useEffect(() => {
    const token = getToken();
    if (!token || !activeOrganizationId) {
      setLoading(false);
      return;
    }

    void apiRequest<OrganizationProfile>(`/organizations/${activeOrganizationId}`, { token })
      .then((payload) => {
        setOrg(payload);
        setFormData(payload);
      })
      .catch((caughtError) => {
        setError(caughtError instanceof Error ? caughtError.message : 'Erreur');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeOrganizationId]);

  const canEditOrganization =
    permissions.includes('manage_org_profile') || permissions.includes('manage_organizations');

  const activeOrgLabel = useMemo(() => {
    if (!activeOrganizationId) return null;
    return orgContext?.organizations.find((item) => item.id === activeOrganizationId)?.name ?? null;
  }, [orgContext, activeOrganizationId]);

  const handleSave = async () => {
    try {
      const token = getToken();
      if (!token || !org) return;

      const updated = await apiRequest<OrganizationProfile>(`/organizations/${org.id}`, {
        method: 'PATCH',
        token,
        body: {
          name: formData.name,
          slug: formData.slug,
          description: formData.description,
          logoUrl: formData.logoUrl,
          brandName: formData.brandName,
          brandPrimaryColor: formData.brandPrimaryColor,
          brandSecondaryColor: formData.brandSecondaryColor,
          brandAccentColor: formData.brandAccentColor,
          sessionTimeoutMinutes: formData.sessionTimeoutMinutes,
        },
      });

      setOrg(updated);
      setFormData(updated);
      setIsEditing(false);
      setError(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Erreur');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Topbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Organisation</h1>
          <p className="text-gray-600 mt-1">
            {activeOrgLabel ? `Organisation active: ${activeOrgLabel}` : 'Aucune organisation active.'}
          </p>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow p-6 text-gray-600">Chargement...</div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
        ) : !org ? (
          <div className="bg-white rounded-lg shadow p-6 text-gray-600">
            Impossible de charger le profil d’organisation.
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{org.name}</h2>
                <p className="text-gray-600">{org.slug}</p>
              </div>
              {canEditOrganization ? (
                <button
                  type="button"
                  onClick={() => (isEditing ? void handleSave() : setIsEditing(true))}
                  className={`font-bold py-2 px-6 rounded transition ${
                    isEditing
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isEditing ? '💾 Enregistrer' : '✏️ Éditer'}
                </button>
              ) : null}
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">Détails</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    {isEditing ? (
                      <textarea
                        value={formData.description ?? ''}
                        onChange={(event) =>
                          setFormData((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        rows={3}
                      />
                    ) : (
                      <p className="text-gray-700">{org.description || '—'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timeout de session (minutes)
                    </label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={formData.sessionTimeoutMinutes ?? 30}
                        onChange={(event) =>
                          setFormData((current) => ({
                            ...current,
                            sessionTimeoutMinutes: Number.parseInt(event.target.value, 10),
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    ) : (
                      <p className="text-gray-700">{org.sessionTimeoutMinutes} minutes</p>
                    )}
                  </div>

                  <div>
                    <span
                      className={`inline-block px-3 py-1 rounded text-sm font-bold ${
                        org.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {org.isActive ? '✓ Active' : '✗ Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">🎨 Marquage blanc</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Logo URL
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.logoUrl ?? ''}
                        onChange={(event) =>
                          setFormData((current) => ({
                            ...current,
                            logoUrl: event.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    ) : (
                      <p className="text-gray-700 break-all">{org.logoUrl || '—'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom de marque
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.brandName ?? ''}
                        onChange={(event) =>
                          setFormData((current) => ({
                            ...current,
                            brandName: event.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    ) : (
                      <p className="text-gray-700">{org.brandName || '—'}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {([
                      ['brandPrimaryColor', 'Couleur 1'],
                      ['brandSecondaryColor', 'Couleur 2'],
                      ['brandAccentColor', 'Accent'],
                    ] as const).map(([key, label]) => (
                      <div key={key}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={(formData[key] as string | null | undefined) ?? ''}
                            onChange={(event) =>
                              setFormData((current) => ({
                                ...current,
                                [key]: event.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="#d95f2b"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block w-4 h-4 rounded border border-gray-200"
                              style={{ background: (org[key] as string | null) ?? 'transparent' }}
                            />
                            <span className="text-gray-700">{(org[key] as string | null) ?? '—'}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

