# Utilisateurs & Authentification

- Authentification Multi-Facteurs (MFA) : Indispensable. En cas de crise réelle simulée, l'accès doit être protégé par SMS ou application d'authentification.

- SSO (Single Sign-On) : Connexion via les comptes d'entreprise (Azure AD, Okta, Google Workspace). C'est un prérequis pour le marché B2B.

- Gestion des statuts : Actif, Suspendu (ex: départ du collaborateur), Invité (pour un consultant externe ou un auditeur).

# Sessions utilisateur

- Persistance de session : Si un utilisateur ferme son navigateur par erreur pendant la simulation, il doit retrouver son interface exactement dans l'état où il l'a laissée.

- Concurrence de session : Empêcher (ou alerter) si le même compte est utilisé sur deux appareils différents simultanément.

- Timeout de sécurité : Déconnexion automatique après une période d'inactivité, ajustable par l'organisation.

# Organisations / Entités

- Hiérarchie : Possibilité de créer des sous-entités (ex: "Filiale France", "Usine Lyon").

- Isolation des données : Une cloison étanche totale entre les organisations. L'Organisation A ne doit jamais voir les scénarios ou les logs de l'Organisation B.

- Marquage blanc : Optionnel, mais permet d'intégrer le logo et les couleurs de l'entreprise cliente

# Rôles & Permissions fines
Il faut distinguer le rôle "Plateforme" (qui gère l'outil) du rôle "Simulation" (qui agit dans la crise).
## Rôles Globaux (SaaS) :

- Super Admin : Accès total (ton équipe).

- Account Manager : Gère les factures et les quotas de l'organisation

## Rôles par Organisation :

- Admin Client : Gère les utilisateurs et les accès de sa propre entreprise

- Concepteur/Animateur : Crée les scénarios et lance les sessions

- Observateur/Auditeur : Accès en lecture seule pour évaluer la performance

- Apprenant/Joueur : Accès limité aux interfaces de simulation

## Permissions Fines (RBAC) : 

- Capacité de définir qui peut : éditer un scénario, voir les rapports de Retex, ou déclencher une alerte




//////////////////////////////////////////////////////////////////////

# Audit des actions utilisateur

- Logs d'administration : "L'utilisateur X a changé le rôle de l'utilisateur Y le 12/05 à 14h".

- Logs d'activité Simulation : Chaque clic, chaque message envoyé, chaque validation de procédure doit être enregistré avec :
    - Horodatage précis (milliseconde).
    - ID de l'utilisateur.
    - Action effectuée.
    - Adresse IP (pour la sécurité).

- Export de l'audit : Possibilité pour le responsable sécurité (RSSI) d'exporter ces logs en format CSV ou JSON pour analyse externe.

# Réinitialisation & Vérification

- Self-service sécurisé : Procédure de mot de passe oublié classique mais avec expiration rapide du lien (ex: 15 minutes).
- Vérification d'e-mail : Obligatoire à l'inscription pour éviter les erreurs de saisie et s'assurer que les notifications de crise arriveront à la bonne adresse.