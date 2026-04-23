'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Topbar } from '@/components/topbar';

interface AdminStats {
  totalOrganizations: number;
  totalUsers: number;
  activeSessions: number;
  totalScenarios: number;
}

interface AdminLink {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: string;
  requiredPermission: string;
  color: string;
}

const adminLinks: AdminLink[] = [
  {
    id: 'organizations',
    title: 'Organisations',
    description: 'Gérer les organisations, hiérarchies et marquage blanc',
    href: '/admin/organizations',
    icon: '🏢',
    requiredPermission: 'manage_organizations',
    color: 'bg-blue-50 hover:bg-blue-100'
  },
  {
    id: 'users',
    title: 'Utilisateurs',
    description: 'Gérer les utilisateurs globaux et les rôles',
    href: '/admin/users',
    icon: '👥',
    requiredPermission: 'manage_roles',
    color: 'bg-purple-50 hover:bg-purple-100'
  },
  {
    id: 'roles',
    title: 'Rôles & Permissions',
    description: 'Configurer les rôles, permissions et accès (RBAC)',
    href: '/admin/roles',
    icon: '🔐',
    requiredPermission: 'manage_roles',
    color: 'bg-red-50 hover:bg-red-100'
  },
  {
    id: 'billing',
    title: 'Facturation',
    description: 'Gérer les quotas, les factures et les abonnements',
    href: '/admin/billing',
    icon: '💳',
    requiredPermission: 'manage_billing',
    color: 'bg-green-50 hover:bg-green-100'
  },
  {
    id: 'audit',
    title: 'Logs d\'Audit',
    description: 'Consulter l\'historique des actions et accès',
    href: '/admin/audit-logs',
    icon: '📋',
    requiredPermission: 'view_audit_logs',
    color: 'bg-yellow-50 hover:bg-yellow-100'
  },
  {
    id: 'scenarios',
    title: 'Scénarios',
    description: 'Gérer les scénarios globaux et les modèles',
    href: '/admin/scenarios',
    icon: '🎭',
    requiredPermission: 'view_scenarios',
    color: 'bg-pink-50 hover:bg-pink-100'
  },
  {
    id: 'sessions',
    title: 'Sessions Actives',
    description: 'Monitorer les sessions en cours',
    href: '/admin/sessions',
    icon: '⚡',
    requiredPermission: 'view_sessions',
    color: 'bg-cyan-50 hover:bg-cyan-100'
  },
  {
    id: 'platform',
    title: 'Paramètres Plateforme',
    description: 'Configuration globale de la plateforme',
    href: '/admin/platform',
    icon: '⚙️',
    requiredPermission: 'manage_organizations',
    color: 'bg-gray-50 hover:bg-gray-100'
  }
];

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch user permissions
        const permRes = await fetch('/api/auth/permissions');
        if (permRes.ok) {
          const permData = await permRes.json();
          setUserPermissions(permData.permissions || []);
        }

        // Fetch admin stats
        const statsRes = await fetch('/api/admin/stats');
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
      } catch (error) {
        console.error('Failed to fetch admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const hasPermission = (requiredPerm: string): boolean => {
    return userPermissions.includes('manage_organizations') || 
           userPermissions.includes('view_platform') ||
           userPermissions.includes(requiredPerm);
  };

  const visibleLinks = adminLinks.filter(link => hasPermission(link.requiredPermission));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Topbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Panneau d'Administration</h1>
          <p className="text-lg text-gray-600">Bienvenue dans l'interface d'administration de Crise Kitty</p>
        </div>

        {/* Stats Cards */}
        {stats && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Organisations</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalOrganizations}</p>
                </div>
                <span className="text-4xl">🏢</span>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Utilisateurs</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
                </div>
                <span className="text-4xl">👥</span>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Sessions Actives</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.activeSessions}</p>
                </div>
                <span className="text-4xl">⚡</span>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Scénarios</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalScenarios}</p>
                </div>
                <span className="text-4xl">🎭</span>
              </div>
            </div>
          </div>
        )}

        {/* Admin Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {visibleLinks.map((link) => (
            <Link
              key={link.id}
              href={link.href}
              className={`p-6 rounded-lg shadow transition-all duration-200 transform hover:scale-105 hover:shadow-lg ${link.color}`}
            >
              <div className="text-4xl mb-4">{link.icon}</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{link.title}</h3>
              <p className="text-sm text-gray-600 mb-4">{link.description}</p>
              <div className="text-sm font-medium text-blue-600 hover:text-blue-700">Accéder →</div>
            </Link>
          ))}
        </div>

        {/* Permission Info */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-2">À propos des Rôles & Permissions</h3>
          <p className="text-blue-800 mb-4">
            Crise Kitty utilise un système RBAC (Role-Based Access Control) à deux niveaux :
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-bold text-blue-900 mb-2">🌐 Rôles Globaux (Plateforme)</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Super Admin</strong> - Accès total</li>
                <li>• <strong>Account Manager</strong> - Gestion facturation</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-blue-900 mb-2">🏢 Rôles par Organisation</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Admin Client</strong> - Gestion membres</li>
                <li>• <strong>Concepteur/Animateur</strong> - Création scénarios</li>
                <li>• <strong>Observateur/Auditeur</strong> - Lecture seule</li>
                <li>• <strong>Apprenant/Joueur</strong> - Accès simulation</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-yellow-900 mb-2">🔒 Notice de Sécurité</h3>
          <p className="text-yellow-800 text-sm">
            Toutes les actions effectuées dans cette zone d'administration sont enregistrées dans les logs d'audit. 
            Assurez-vous que seules les personnes autorisées ont accès à ces fonctions.
          </p>
        </div>
      </div>
    </div>
  );
}
