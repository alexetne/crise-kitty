'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Topbar } from '@/components/topbar';
import { useParams } from 'next/navigation';

interface OrganizationProfile {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  logoUrl?: string;
  brandName?: string;
  brandPrimaryColor?: string;
  brandSecondaryColor?: string;
  brandAccentColor?: string;
  sessionTimeoutMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export default function OrganizationProfilePage() {
  const params = useParams();
  const orgId = params.id as string;
  const [org, setOrg] = useState<OrganizationProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<OrganizationProfile>>({});

  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        const res = await fetch(`/api/admin/organizations/${orgId}`);
        if (!res.ok) throw new Error('Failed to fetch organization');
        const data = await res.json();
        setOrg(data);
        setFormData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    };

    fetchOrganization();
  }, [orgId]);

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to update organization');
      const data = await res.json();
      setOrg(data);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Topbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Topbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error || 'Organisation non trouvée'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Topbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href="/admin/organizations"
          className="text-blue-600 hover:text-blue-700 mb-4 inline-block"
        >
          ← Retour aux organisations
        </Link>

        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{org.name}</h1>
              <p className="text-gray-600 mt-1">{org.slug}</p>
            </div>
            <button
              onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
              className={`font-bold py-2 px-6 rounded transition ${
                isEditing
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isEditing ? '💾 Enregistrer' : '✏️ Éditer'}
            </button>
          </div>

          {/* Main Content */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Organization Details */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Détails</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    {isEditing ? (
                      <textarea
                        value={formData.description || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        rows={3}
                      />
                    ) : (
                      <p className="text-gray-700">
                        {org.description || 'Aucune description'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timeout de Session (minutes)
                    </label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={formData.sessionTimeoutMinutes || 30}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            sessionTimeoutMinutes: parseInt(e.target.value),
                          })
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
                        org.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {org.isActive ? '✓ Actif' : '✗ Inactif'}
                    </span>
                  </div>
                </div>
              </div>

              {/* White Label Branding */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  🎨 Marquage Blanc
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom de Marque
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.brandName || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            brandName: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    ) : (
                      <p className="text-gray-700">
                        {org.brandName || 'Non défini'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Couleur Primaire
                    </label>
                    {isEditing ? (
                      <input
                        type="color"
                        value={formData.brandPrimaryColor || '#d95f2b'}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            brandPrimaryColor: e.target.value,
                          })
                        }
                        className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-12 h-10 rounded-lg border border-gray-300"
                          style={{
                            backgroundColor:
                              org.brandPrimaryColor || '#d95f2b',
                          }}
                        />
                        <span className="text-gray-700 font-mono">
                          {org.brandPrimaryColor || '#d95f2b'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Couleur Secondaire
                    </label>
                    {isEditing ? (
                      <input
                        type="color"
                        value={formData.brandSecondaryColor || '#1f6b5b'}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            brandSecondaryColor: e.target.value,
                          })
                        }
                        className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-12 h-10 rounded-lg border border-gray-300"
                          style={{
                            backgroundColor:
                              org.brandSecondaryColor || '#1f6b5b',
                          }}
                        />
                        <span className="text-gray-700 font-mono">
                          {org.brandSecondaryColor || '#1f6b5b'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Members Section */}
          <div className="p-6 border-t border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Membres</h2>
            <p className="text-gray-600 text-sm">
              Section de gestion des membres à implémenter
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
