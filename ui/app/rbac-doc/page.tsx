'use client';

import { Topbar } from '@/components/topbar';
import Link from 'next/link';

export default function RBACDocPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Topbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Système RBAC de Crise Kitty</h1>
          <p className="text-xl text-gray-600">
            Documentation complète sur les rôles, permissions et contrôle d'accès
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <Link
            href="/admin"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg transition text-center"
          >
            Aller au Dashboard Admin →
          </Link>
          <Link
            href="/admin/roles"
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-lg transition text-center"
          >
            Gérer les Rôles →
          </Link>
          <Link
            href="/admin/organizations"
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg transition text-center"
          >
            Gérer les Organisations →
          </Link>
        </div>

        {/* Rôles Globaux */}
        <div className="bg-white rounded-lg shadow p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">🌐 Rôles Globaux (Plateforme)</h2>
          <div className="space-y-6">
            <div className="border-l-4 border-blue-600 pl-6">
              <h3 className="text-2xl font-bold text-gray-900">Super Admin</h3>
              <p className="text-gray-600 mt-2">
                Accès complet à tous les aspects de la plateforme. Réservé à l'équipe interne.
              </p>
              <div className="mt-4 bg-blue-50 p-4 rounded-lg">
                <h4 className="font-bold text-blue-900 mb-2">Permissions:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>✓ Gestion complète des organisations</li>
                  <li>✓ Gestion des utilisateurs globaux</li>
                  <li>✓ Configuration des rôles et permissions</li>
                  <li>✓ Accès aux logs d'audit complets</li>
                  <li>✓ Gestion de la facturation</li>
                  <li>✓ Paramètres de plateforme</li>
                </ul>
              </div>
            </div>

            <div className="border-l-4 border-green-600 pl-6">
              <h3 className="text-2xl font-bold text-gray-900">Account Manager</h3>
              <p className="text-gray-600 mt-2">
                Gère les relations avec les organisations clientes, factures et quotas.
              </p>
              <div className="mt-4 bg-green-50 p-4 rounded-lg">
                <h4 className="font-bold text-green-900 mb-2">Permissions:</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>✓ Voir les organisations</li>
                  <li>✓ Gérer la facturation et les quotas</li>
                  <li>✓ Accéder aux logs d'audit</li>
                  <li>✓ Voir les rapports d'utilisation</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Rôles Organisation */}
        <div className="bg-white rounded-lg shadow p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">🏢 Rôles par Organisation</h2>
          <div className="space-y-6">
            <div className="border-l-4 border-purple-600 pl-6">
              <h3 className="text-2xl font-bold text-gray-900">Admin Client</h3>
              <p className="text-gray-600 mt-2">
                Gère les utilisateurs et accès de sa propre organisation.
              </p>
              <div className="mt-4 bg-purple-50 p-4 rounded-lg">
                <h4 className="font-bold text-purple-900 mb-2">Permissions:</h4>
                <ul className="text-sm text-purple-800 space-y-1">
                  <li>✓ Gérer les membres de l'organisation</li>
                  <li>✓ Assigner les rôles organisationnels</li>
                  <li>✓ Voir et éditer le profil de l'organisation</li>
                  <li>✓ Configurer le marquage blanc</li>
                  <li>✓ Voir les scénarios et sessions</li>
                </ul>
              </div>
            </div>

            <div className="border-l-4 border-pink-600 pl-6">
              <h3 className="text-2xl font-bold text-gray-900">Concepteur/Animateur</h3>
              <p className="text-gray-600 mt-2">
                Crée les scénarios, les paramètre et lance les sessions de simulation.
              </p>
              <div className="mt-4 bg-pink-50 p-4 rounded-lg">
                <h4 className="font-bold text-pink-900 mb-2">Permissions:</h4>
                <ul className="text-sm text-pink-800 space-y-1">
                  <li>✓ Créer et éditer des scénarios</li>
                  <li>✓ Publier des scénarios</li>
                  <li>✓ Créer des sessions de simulation</li>
                  <li>✓ Gérer les sessions (pause, reprise, fin)</li>
                  <li>✓ Déclencher les injections</li>
                  <li>✓ Consulter les rapports</li>
                </ul>
              </div>
            </div>

            <div className="border-l-4 border-orange-600 pl-6">
              <h3 className="text-2xl font-bold text-gray-900">Observateur/Auditeur</h3>
              <p className="text-gray-600 mt-2">
                Accès en lecture seule pour évaluer la performance et les résultats.
              </p>
              <div className="mt-4 bg-orange-50 p-4 rounded-lg">
                <h4 className="font-bold text-orange-900 mb-2">Permissions:</h4>
                <ul className="text-sm text-orange-800 space-y-1">
                  <li>✓ Voir les scénarios</li>
                  <li>✓ Observer les sessions en cours</li>
                  <li>✓ Consulter les rapports et statistiques</li>
                  <li>✓ Exporter les données de session</li>
                </ul>
              </div>
            </div>

            <div className="border-l-4 border-cyan-600 pl-6">
              <h3 className="text-2xl font-bold text-gray-900">Apprenant/Joueur</h3>
              <p className="text-gray-600 mt-2">
                Accès limité aux interfaces de simulation pour participer.
              </p>
              <div className="mt-4 bg-cyan-50 p-4 rounded-lg">
                <h4 className="font-bold text-cyan-900 mb-2">Permissions:</h4>
                <ul className="text-sm text-cyan-800 space-y-1">
                  <li>✓ Participer aux sessions de simulation</li>
                  <li>✓ Prendre des décisions (faire des choix)</li>
                  <li>✓ Consulter les rapports personnels</li>
                  <li>✓ Voir son profil</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Permissions Fines */}
        <div className="bg-white rounded-lg shadow p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">🔒 Permissions Fines</h2>
          <p className="text-gray-600 mb-6">
            Chaque permission est composée d'une <strong>ressource</strong> et d'une <strong>action</strong>:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-gray-900 mb-3">Ressources</h3>
              <ul className="text-sm text-gray-700 space-y-2">
                <li><code className="bg-gray-100 px-2 py-1 rounded">organizations</code> - Organisations</li>
                <li><code className="bg-gray-100 px-2 py-1 rounded">scenarios</code> - Scénarios</li>
                <li><code className="bg-gray-100 px-2 py-1 rounded">sessions</code> - Sessions</li>
                <li><code className="bg-gray-100 px-2 py-1 rounded">reports</code> - Rapports</li>
                <li><code className="bg-gray-100 px-2 py-1 rounded">roles</code> - Rôles</li>
                <li><code className="bg-gray-100 px-2 py-1 rounded">injections</code> - Injections</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-3">Actions</h3>
              <ul className="text-sm text-gray-700 space-y-2">
                <li><code className="bg-gray-100 px-2 py-1 rounded">view</code> - Voir/Consulter</li>
                <li><code className="bg-gray-100 px-2 py-1 rounded">create</code> - Créer</li>
                <li><code className="bg-gray-100 px-2 py-1 rounded">edit</code> - Modifier</li>
                <li><code className="bg-gray-100 px-2 py-1 rounded">delete</code> - Supprimer</li>
                <li><code className="bg-gray-100 px-2 py-1 rounded">manage</code> - Gestion complète</li>
                <li><code className="bg-gray-100 px-2 py-1 rounded">publish</code> - Publier</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Marquage Blanc */}
        <div className="bg-white rounded-lg shadow p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">🎨 Marquage Blanc (White-Label)</h2>
          <p className="text-gray-600 mb-6">
            Chaque organisation peut personnaliser son expérience utilisateur :
          </p>
          <ul className="text-gray-700 space-y-3 mb-6">
            <li><strong>Logo personnalisé</strong> - Remplacer le logo Crise Kitty</li>
            <li><strong>Nom de marque</strong> - Utiliser le nom de votre organisation</li>
            <li><strong>Couleur primaire</strong> - Définir la couleur d'accent principale</li>
            <li><strong>Couleur secondaire</strong> - Définir une couleur secondaire</li>
            <li><strong>Couleur d'accent</strong> - Personnaliser les accents UI</li>
          </ul>
          <Link
            href="/admin/organizations"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded transition"
          >
            Configurer le marquage blanc →
          </Link>
        </div>

        {/* Bonnes Pratiques */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-blue-900 mb-6">✓ Bonnes Pratiques de Sécurité</h2>
          <ul className="text-blue-800 space-y-3">
            <li>
              <strong>Principe du Moindre Privilège</strong> : Attribuez uniquement les permissions nécessaires
            </li>
            <li>
              <strong>Isolation par Organisation</strong> : Les données d'une organisation ne sont jamais accessibles à une autre
            </li>
            <li>
              <strong>Audit Complet</strong> : Toutes les actions d'administration sont enregistrées
            </li>
            <li>
              <strong>Révocation Rapide</strong> : Vous pouvez retirer l'accès d'un utilisateur instantanément
            </li>
            <li>
              <strong>Rôles Système</strong> : Les rôles définis par le système ne peuvent pas être modifiés ou supprimés
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
