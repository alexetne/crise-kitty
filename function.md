# Utilisateurs & Authentification

- Authentification Multi-Facteurs (MFA) : Indispensable. En cas de crise réelle simulée, l'accès doit être protégé par SMS ou application d'authentification.

- SSO (Single Sign-On) : Connexion via les comptes d'entreprise (Azure AD, Okta, Google Workspace). C'est un prérequis pour le marché B2B.

- Gestion des statuts : Actif, Suspendu (ex: départ du collaborateur), Invité (pour un consultant externe ou un auditeur).

# Sessions utilisateur

- Persistance de session : Si un utilisateur ferme son navigateur par erreur pendant la simulation, il doit retrouver son interface exactement dans l'état où il l'a laissée.

- Concurrence de session : Empêcher (ou alerter) si le même compte est utilisé sur deux appareils différents simultanément.

- Timeout de sécurité : Déconnexion automatique après une période d'inactivité, ajustable par l'organisation.