'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Topbar } from '@/components/topbar';
import { apiRequest } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  memberCount?: number;
  brandName?: string;
  createdAt: string;
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const token = getToken();
        if (!token) throw new Error('Unauthorized');
        const data = await apiRequest<Organization[]>('/admin/organizations', { token });
        setOrganizations(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Topbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link href="/admin" className="text-blue-600 hover:text-blue-700 mb-4 inline-block">← Retour admin</Link>
            <h1 className="text-4xl font-bold text-gray-900">Organisations</h1>
            <p className="text-gray-600 mt-2">Gérez les organisations et leurs hiérarchies</p>
          </div>
          <button
            disabled
            title="La création d'organisation passe par l'API /organizations (à implémenter côté UI)."
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition opacity-60 cursor-not-allowed"
          >
            + Nouvelle Organisation
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Chargement...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {organizations.map((org) => (
              <Link
                key={org.id}
                href={`/admin/organizations/${org.id}`}
                className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-2">{org.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{org.description || 'Pas de description'}</p>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-700"><strong>Slug:</strong> {org.slug}</p>
                  <p className="text-gray-700"><strong>Marque:</strong> {org.brandName || 'Non définie'}</p>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <span className={`inline-block px-3 py-1 rounded text-xs font-bold ${org.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {org.isActive ? 'Actif' : 'Inactif'}
                    </span>
                    <span className="text-gray-500">👥 {org.memberCount || 0}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
