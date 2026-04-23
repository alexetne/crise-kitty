'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Topbar } from '@/components/topbar';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
}

export default function RbacDocPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Topbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">
              Documentation RBAC - Rôles & Permissions
            </h1>
            <p className="mt-2 text-gray-600">
              Guide complet du système de contrôle d'accès basé sur les rôles
            </p>
          </div>

          <div className="p-6 space-y-8">
            {/* Vue d'ensemble */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Vue d'ensemble du système RBAC
              </h2>
              <div className="prose max-w-none">
                <p className="text-gray-700 mb-4">
                  Le système RBAC (Role-Based Access Control) de Crise Kitty implémente
                  une architecture à deux niveaux pour une gestion fine des permissions :
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li><strong>Rôles globaux</strong> : Permissions au niveau plateforme</li>
                  <li><strong>Rôles d'organisation</strong> : Permissions limitées à une organisation spécifique</li>
                </ul>
              </div>
            </section>

            {/* Rôles disponibles */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Rôles disponibles
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Rôles globaux */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-blue-900 mb-3">
                    Rôles globaux
                  </h3>
                  <ul className="space-y-2 text-blue-800">
                    <li><strong>super_admin</strong> : Contrôle total de la plateforme</li>
                    <li><strong>account_manager</strong> : Gestion des comptes utilisateurs</li>
                    <li><strong>org_creator</strong> : Création d'organisations</li>
                    <li><strong>viewer</strong> : Lecture seule sur la plateforme</li>
                  </ul>
                </div>

                {/* Rôles d'organisation */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-green-900 mb-3">
                    Rôles d'organisation
                  </h3>
                  <ul className="space-y-2 text-green-800">
                    <li><strong>org_admin</strong> : Administration complète de l'organisation</li>
                    <li><strong>org_manager</strong> : Gestion des membres et projets</li>
                    <li><strong>org_member</strong> : Membre standard avec permissions limitées</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Permissions détaillées */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Permissions détaillées
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Permission
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Portée
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        view_platform
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        Accès en lecture à la plateforme
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        Global
                      </td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        manage_organizations
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        Créer, modifier et supprimer des organisations
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        Global
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        manage_users
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        Gérer les comptes utilisateurs
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        Global
                      </td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        manage_roles
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        Attribuer et révoquer les rôles
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        Global/Organisation
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        view_organization
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        Accès en lecture à l'organisation
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        Organisation
                      </td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        manage_organization
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        Modifier les paramètres de l'organisation
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        Organisation
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        manage_members
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        Gérer les membres de l'organisation
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        Organisation
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Architecture technique */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Architecture technique
              </h2>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Modèles de données
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded border">
                    <h4 className="font-medium text-gray-900">Role</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Définit les rôles avec code, nom et portée
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded border">
                    <h4 className="font-medium text-gray-900">Permission</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Permissions atomiques du système
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded border">
                    <h4 className="font-medium text-gray-900">RolePermission</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Association rôles-permissions
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded border">
                    <h4 className="font-medium text-gray-900">UserGlobalRole</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Rôles globaux des utilisateurs
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded border">
                    <h4 className="font-medium text-gray-900">OrganizationMemberRole</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Rôles dans les organisations
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Guide d'utilisation */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Guide d'utilisation
              </h2>
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-yellow-900 mb-2">
                    Attribution des rôles
                  </h3>
                  <p className="text-yellow-800">
                    Les rôles peuvent être attribués via l'interface d'administration ou
                    l'API. Les super administrateurs peuvent gérer tous les rôles,
                    tandis que les administrateurs d'organisation ne peuvent gérer
                    que les rôles de leur organisation.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-blue-900 mb-2">
                    Vérification des permissions
                  </h3>
                  <p className="text-blue-800">
                    Le système vérifie automatiquement les permissions avant chaque
                    action. Les utilisateurs doivent avoir au moins un rôle global
                    ou organisationnel approprié pour accéder aux fonctionnalités.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}