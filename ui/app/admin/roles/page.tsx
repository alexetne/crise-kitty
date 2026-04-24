'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Topbar } from '@/components/topbar';
import { apiRequest } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface Role {
  id: string;
  code: string;
  name: string;
  scope: 'global' | 'organization';
  description?: string;
  isSystem: boolean;
  permissionCount?: number;
}

interface RoleDetails extends Role {
  permissions: Array<{
    id: string;
    code: string;
    name: string;
    resource: string;
    action: string;
  }>;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<RoleDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const token = getToken();
        if (!token) throw new Error('Unauthorized');
        const data = await apiRequest<Role[]>('/admin/roles', { token });
        setRoles(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, []);

  const handleSelectRole = async (role: Role) => {
    try {
      const token = getToken();
      if (!token) throw new Error('Unauthorized');
      const data = await apiRequest<RoleDetails>(`/admin/roles/${role.id}`, { token });
      setSelectedRole(data);
    } catch (err) {
      console.error('Failed to fetch role details:', err);
    }
  };

  const globalRoles = roles.filter(r => r.scope === 'global');
  const orgRoles = roles.filter(r => r.scope === 'organization');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Topbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/admin" className="text-blue-600 hover:text-blue-700 mb-4 inline-block">← Retour admin</Link>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Rôles & Permissions</h1>
        <p className="text-gray-600 mb-8">Gérez les rôles et définissez les permissions d'accès (RBAC)</p>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Chargement...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Rôles List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">Rôles Globaux</h2>
                </div>
                <div className="divide-y">
                  {globalRoles.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => handleSelectRole(role)}
                      className={`w-full text-left p-4 transition ${
                        selectedRole?.id === role.id
                          ? 'bg-blue-50 border-l-4 border-blue-600'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-bold text-gray-900">{role.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{role.code}</div>
                      {!role.isSystem && (
                        <div className="text-xs bg-yellow-100 text-yellow-800 inline-block mt-2 px-2 py-1 rounded">
                          Personnalisé
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <div className="p-6 border-t border-gray-200 bg-gray-50">
                  <h3 className="font-bold text-gray-900 mb-3">Rôles Organisation</h3>
                  <div className="divide-y">
                    {orgRoles.map((role) => (
                      <button
                        key={role.id}
                        onClick={() => handleSelectRole(role)}
                        className={`w-full text-left p-4 transition text-sm ${
                          selectedRole?.id === role.id
                            ? 'bg-blue-50 border-l-4 border-blue-600'
                            : 'hover:bg-white'
                        }`}
                      >
                        <div className="font-bold text-gray-900">{role.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{role.code}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Permissions Detail */}
            <div className="lg:col-span-2">
              {selectedRole ? (
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900">{selectedRole.name}</h2>
                    <p className="text-gray-600 mt-2">{selectedRole.description}</p>
                    <div className="mt-4 flex gap-4">
                      <span className={`inline-block px-3 py-1 rounded text-sm font-bold ${
                        selectedRole.scope === 'global'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {selectedRole.scope === 'global' ? '🌐 Global' : '🏢 Organisation'}
                      </span>
                      {selectedRole.isSystem && (
                        <span className="inline-block px-3 py-1 rounded text-sm font-bold bg-green-100 text-green-800">
                          ✓ Système
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-6">
                    <h3 className="font-bold text-lg text-gray-900 mb-4">
                      Permissions ({selectedRole.permissions.length})
                    </h3>
                    {selectedRole.permissions.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedRole.permissions.map((perm) => (
                          <div
                            key={perm.id}
                            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
                          >
                            <div className="font-bold text-gray-900">{perm.name}</div>
                            <div className="text-xs text-gray-600 mt-1">{perm.code}</div>
                            <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                              <span className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                                {perm.resource}
                              </span>
                              <span className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                                {perm.action}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600">Aucune permission assignée à ce rôle.</p>
                    )}
                  </div>

                  <div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-3">
                    <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded transition">
                      Éditer
                    </button>
                    {!selectedRole.isSystem && (
                      <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded transition">
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <p className="text-gray-600">Sélectionnez un rôle pour voir ses permissions</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* RBAC Info */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-4">📚 Documentation RBAC</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-blue-800 text-sm">
            <div>
              <h4 className="font-bold mb-2">Permissions Disponibles</h4>
              <p className="mb-3">
                Chaque permission est composée d'une ressource (organizations, scenarios, users, etc.) 
                et d'une action (view, create, edit, delete, manage).
              </p>
              <p>
                Les permissions peuvent être combinées pour créer des rôles spécifiques à vos besoins.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-2">Types de Rôles</h4>
              <ul className="space-y-1">
                <li>• <strong>Rôles Globaux</strong> (platform-level) : Super Admin, Account Manager</li>
                <li>• <strong>Rôles Organisation</strong> : Admin Client, Concepteur, Observateur, Participant</li>
                <li>• <strong>Rôles Système</strong> : Définis par le système, non modifiables</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
