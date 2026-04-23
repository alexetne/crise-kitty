# Guide Rapide - Accès aux Fonctions d'Administration

## 🚀 Comment Accéder au Panneau d'Administration

### 1. **Dashboard Admin Principal**
   - **URL:** `http://localhost:5000/admin`
   - **Accès:** Utilisateurs authentifiés avec permissions d'admin
   - **Contient:**
     - Statistiques globales (organisations, utilisateurs, sessions, scénarios)
     - 8 boutons d'accès rapide vers les sections principales
     - Info RBAC et notice de sécurité

### 2. **Gestion des Organisations**
   - **URL:** `http://localhost:5000/admin/organizations`
   - **Accès:** Super Admin, Account Manager
   - **Permet:**
     - Lister toutes les organisations
     - Voir les détails de chaque organisation
     - Accéder au profil pour édition

### 3. **Profil Organisation & Marquage Blanc**
   - **URL:** `http://localhost:5000/admin/organizations/[id]`
   - **Accès:** Super Admin, Admin Client
   - **Permet:**
     - Éditer description et détails
     - Configurer marquage blanc (logo, marque, couleurs)
     - Gérer le timeout de session
     - Voir les membres de l'organisation

### 4. **Gestion des Rôles & Permissions**
   - **URL:** `http://localhost:5000/admin/roles`
   - **Accès:** Super Admin
   - **Permet:**
     - Voir la liste de tous les rôles
     - Consulter les permissions de chaque rôle
     - Créer de nouveaux rôles personnalisés
     - Éditer les rôles (sauf rôles système)
     - Assigner les permissions

### 5. **Documentation RBAC**
   - **URL:** `http://localhost:5000/rbac-doc`
   - **Accès:** Tout le monde
   - **Contient:**
     - Description détaillée de tous les rôles
     - Liste complète des permissions
     - Bonnes pratiques de sécurité
     - Info sur le marquage blanc

---

## 📊 Accès Rapide par Rôle

### Super Admin
- ✓ **Toutes les pages** accessibles
- Accès à: Dashboard, Organisations, Rôles, Utilisateurs, Facturation, Audit, Scénarios, Sessions

### Account Manager
- ✓ Organisations (vue)
- ✓ Facturation
- ✓ Logs d'audit
- ✗ Pas d'accès à: Rôles (édition), Utilisateurs

### Admin Client (Organisation)
- ✓ Profil organisation (édition)
- ✓ Gestion des membres
- ✓ Gestion des rôles organisationnels
- ✓ Voir scénarios et sessions
- ✓ Voir rapports

### Concepteur/Animateur
- ✓ Créer et éditer scénarios
- ✓ Publier scénarios
- ✓ Gérer sessions
- ✓ Déclencher injections
- ✗ Pas d'accès à: Gestion utilisateurs, Facturation

### Observateur/Auditeur
- ✓ Voir (lecture seule)
- ✗ Pas de création/modification

### Apprenant/Joueur
- ✓ Participer aux sessions
- ✓ Voir rapports personnels
- ✗ Pas d'accès aux outils d'administration

---

## 🎛️ Navigations Principales

### Depuis le Menu Topbar
1. Cliquer sur **"Admin"** (visible si connecté avec permissions)
2. Accédez au dashboard principal

### Via URL Directe
```bash
# Dashboard principal
http://localhost:5000/admin

# Organisations
http://localhost:5000/admin/organizations

# Rôles & Permissions
http://localhost:5000/admin/roles

# Documentation
http://localhost:5000/rbac-doc
```

---

## 🔑 Clés API (Backend)

Si vous accédez directement aux endpoints API :

### Récupérer les Permissions
```bash
GET http://localhost:5001/auth/permissions
Header: Authorization: Bearer <JWT_TOKEN>
```

### Lister les Rôles
```bash
GET http://localhost:5001/admin/roles
Header: Authorization: Bearer <JWT_TOKEN>
```

### Détails d'un Rôle
```bash
GET http://localhost:5001/admin/roles/{roleId}
Header: Authorization: Bearer <JWT_TOKEN>
```

### Créer un Rôle
```bash
POST http://localhost:5001/admin/roles
Header: Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "code": "custom_role",
  "name": "Rôle Personnalisé",
  "scope": "organization",
  "description": "Description...",
  "permissionIds": ["perm-id-1", "perm-id-2"]
}
```

---

## 📋 Checklist d'Implémentation

- ✅ Modèles RBAC dans la base de données
- ✅ Schéma Prisma avec relations RBAC
- ✅ Routes API backend pour admin
- ✅ Pages UI admin (dashboard, organisations, rôles)
- ✅ Profil organisation avec marquage blanc
- ✅ Documentation RBAC interactive
- ✅ Navigation dans topbar
- ✅ Endpoints API pour les permissions
- ✅ Sécurité des routes (vérification des permissions)

---

## 🎓 Tutoriels

### Créer une Organisation Personnalisée

1. Aller à `http://localhost:5000/admin/organizations`
2. Cliquer sur "+ Nouvelle Organisation"
3. Remplir les détails
4. Cliquer sur l'organisation créée
5. Cliquer sur "Éditer"
6. Configurer le marquage blanc :
   - Logo URL
   - Nom de marque
   - Couleurs (primaire, secondaire, accent)
7. Sauvegarder

### Assigner un Rôle à un Utilisateur

1. Aller à `http://localhost:5000/admin/users`
2. Chercher l'utilisateur
3. Cliquer sur "Modifier"
4. Sélectionner le rôle global ou organisationnel
5. Sauvegarder

### Créer un Rôle Personnalisé

1. Aller à `http://localhost:5000/admin/roles`
2. Cliquer sur "Créer un Rôle"
3. Remplir le code du rôle
4. Sélectionner le scope (global ou organisation)
5. Sélectionner les permissions
6. Créer

---

## ⚠️ Important à Retenir

- 🔒 **Sécurité d'abord:** Les permissions sont vérifiées côté serveur
- 🏢 **Isolation par organisation:** Les données ne se mélangent jamais
- 📊 **Audit complet:** Toutes les actions d'admin sont enregistrées
- 🛑 **Rôles système:** Ne peuvent pas être modifiés ou supprimés
- 👤 **Une organisation = Au moins 1 admin:** Veillez à toujours avoir un Admin Client

---

**Dernière mise à jour:** 23 avril 2026
