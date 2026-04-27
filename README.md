<div align="center">

# 🚀 nestjs-saas-starter

**Enterprise-grade SaaS Starter Kit — Built in 14 days**

[![NestJS](https://img.shields.io/badge/NestJS-v10-e0234e?style=for-the-badge&logo=nestjs)](https://nestjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?style=for-the-badge&logo=typescript)](https://typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-7.x-2d3748?style=for-the-badge&logo=prisma)](https://prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?style=for-the-badge&logo=postgresql)](https://postgresql.org)
[![GraphQL](https://img.shields.io/badge/GraphQL-Apollo-e10098?style=for-the-badge&logo=graphql)](https://graphql.org)
[![Jest](https://img.shields.io/badge/Jest-TDD-c21325?style=for-the-badge&logo=jest)](https://jestjs.io)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ed?style=for-the-badge&logo=docker)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

**[🌐 Live Demo](https://nestjs-saas-auth-starter.onrender.com) • [📄 API Docs](https://nestjs-saas-auth-starter.onrender.com/api/docs) • [📡 GraphQL](https://nestjs-saas-auth-starter.onrender.com/graphql)**

---

*Arrêtez de reconstruire les mêmes fondations à chaque projet SaaS.*
*Ce starter kit production-ready vous fait gagner des semaines de développement.*

</div>

---

## 📋 Table des matières

- [Vue d'ensemble](#-vue-densemble)
- [Fonctionnalités](#-fonctionnalités)
- [Stack technique](#-stack-technique)
- [Architecture](#-architecture)
- [Installation rapide](#-installation-rapide)
- [Configuration](#-configuration)
- [API REST](#-api-rest)
- [API GraphQL](#-api-graphql)
- [Tests](#-tests)
- [Déploiement](#-déploiement)
- [Auteur](#-auteur)

---

## 🎯 Vue d'ensemble

`nestjs-saas-starter` est un starter kit **open source** et **production-ready** pour
accélérer le développement de vos projets SaaS.

Construit en **14 jours** avec une approche **TDD** (Test Driven Development),
il intègre toutes les fonctionnalités essentielles d'une application SaaS moderne.

```
✅ 95+ tests unitaires et E2E
✅ Couverture de code > 80%
✅ Double API : REST (Swagger) + GraphQL (Apollo)
✅ Déployé et disponible en production
```

---

## ✨ Fonctionnalités

### 🔐 Authentification complète
| Fonctionnalité | Status |
|---|---|
| Signup / Login / Logout | ✅ |
| JWT Access Token (15min) + Refresh Token (7j) | ✅ |
| Rotation automatique des Refresh Tokens | ✅ |
| Vérification email par OTP (6 chiffres, 15min) | ✅ |
| Reset password par OTP | ✅ |
| 2FA — Google Authenticator (TOTP) | ✅ |
| OAuth Google | ✅ |
| API Key (avec hash bcrypt) | ✅ |

### 👥 Gestion des utilisateurs
| Fonctionnalité | Status |
|---|---|
| CRUD utilisateurs | ✅ |
| RBAC — Rôles et permissions | ✅ |
| Profile utilisateur | ✅ |
| Activation compte par email | ✅ |

### 🏢 SaaS Ready
| Fonctionnalité | Status |
|---|---|
| Multi-tenancy (organisations) | ✅ |
| Plans : Free, Pro, Enterprise | ✅ |
| Invitations membres par email | ✅ |
| Rôles dans l'organisation : OWNER, ADMIN, MEMBER | ✅ |

### 🌍 i18n — Message Keys
| Fonctionnalité | Status |
|---|---|
| Erreurs traduisibles | ✅ |
| Support EN / FR | ✅ |
| Clés i18n dans toutes les réponses | ✅ |

### 📡 Double API
| Fonctionnalité | Status |
|---|---|
| REST API avec Swagger | ✅ |
| GraphQL avec Apollo (Code First) | ✅ |
| Rate Limiting par endpoint | ✅ |

### 🚀 Production Ready
| Fonctionnalité | Status |
|---|---|
| Docker Compose | ✅ |
| Rate Limiting (5 req/min auth, 3 req/min email) | ✅ |
| Logging structuré JSON | ✅ |
| Exception Filter global | ✅ |
| Response Interceptor unifié | ✅ |
| Variables d'environnement validées | ✅ |

---

## 🛠 Stack technique

```
Backend      → NestJS 10 + TypeScript 5
Base de données → PostgreSQL 15 + Prisma 7
API          → REST (Swagger) + GraphQL (Apollo)
Auth         → JWT + Passport + bcryptjs
2FA          → speakeasy (TOTP)
OAuth        → passport-google-oauth20
Emails       → nodemailer + HTML templates
Tests        → Jest (TDD) — 95+ tests
Infrastructure → Docker Compose
Déploiement  → Render.com
```

---

## 🏗 Architecture

```
nestjs-saas-starter/
├── src/
│   ├── auth/                    # 🔐 Authentification
│   │   ├── strategies/          #    JWT, Google, API Key
│   │   ├── guards/              #    JwtAuthGuard, ApiKeyGuard...
│   │   ├── decorators/          #    @CurrentUser()
│   │   ├── dto/                 #    SignupDto, LoginDto...
│   │   ├── types/               #    AuthTokens, JwtPayload...
│   │   ├── auth.service.ts      #    Logique auth + 2FA
│   │   ├── oauth.service.ts     #    Google OAuth
│   │   ├── api-key.service.ts   #    API Key management
│   │   └── two-factor.service.ts #   TOTP 2FA
│   │
│   ├── users/                   # 👥 Gestion utilisateurs + RBAC
│   ├── organizations/           # 🏢 Multi-tenancy + Invitations
│   │
│   ├── graphql/                 # 📡 API GraphQL
│   │   ├── resolvers/           #    Auth, Users, Organizations
│   │   ├── types/               #    ObjectTypes
│   │   └── inputs/              #    InputTypes
│   │
│   ├── i18n/                    # 🌍 Traductions EN/FR
│   ├── mail/                    # 📧 Emails transactionnels
│   │   └── templates/           #    HTML templates
│   │
│   ├── common/                  # 🔧 Utilitaires partagés
│   │   ├── guards/              #    RolesGuard, GqlAuthGuard
│   │   ├── decorators/          #    @Roles(), @GqlCurrentUser()
│   │   ├── filters/             #    HttpExceptionFilter
│   │   ├── interceptors/        #    Logging, Response
│   │   ├── logger/              #    Structured JSON logging
│   │   └── config/              #    ThrottlerConfig
│   │
│   └── prisma/                  # 🗄 Base de données
│       └── seed.ts              #    Rôles par défaut
│
├── test/                        # 🧪 Tests E2E
│   ├── helpers/                 #    createTestApp, cleanDatabase
│   ├── auth.e2e-spec.ts
│   ├── users.e2e-spec.ts
│   └── organizations.e2e-spec.ts
│
├── prisma/
│   └── schema.prisma            # Schéma DB complet
│
├── docker-compose.yml           # PostgreSQL + Redis
├── render.yaml                  # Configuration Render.com
└── .env.example                 # Variables d'environnement
```

---

## ⚡ Installation rapide

### Prérequis

```bash
node >= 18
npm >= 9
docker & docker-compose
```

### 1. Cloner le projet

```bash
git clone https://github.com/alibia-phanuel/nestjs-saas-auth-starter.git
cd nestjs-saas-auth-starter
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer l'environnement

```bash
cp .env.example .env
# Éditez .env avec vos valeurs
```

### 4. Lancer la base de données

```bash
docker-compose up -d
```

### 5. Migrations et seed

```bash
npx prisma migrate dev
npx prisma generate
npm run seed
```

### 6. Lancer en développement

```bash
npm run start:dev
```

### 7. Accéder à l'application

```
App        → http://localhost:3000
Swagger    → http://localhost:3000/api/docs
GraphQL    → http://localhost:3000/graphql
Health     → http://localhost:3000/health
```

---

## ⚙️ Configuration

### Variables d'environnement

```env
# Application
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# Base de données
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/saas_auth_db"

# JWT
JWT_ACCESS_SECRET=your_very_long_random_secret_here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=another_very_long_random_secret_here
JWT_REFRESH_EXPIRES_IN=7d

# Email (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
SENDER_EMAIL=your_email@gmail.com

# OAuth Google
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

### Générer des secrets JWT sécurisés

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 📡 API REST

### Authentification

| Method | Endpoint | Description | Rate Limit |
|--------|----------|-------------|------------|
| POST | `/auth/signup` | Inscription | 3/min |
| POST | `/auth/verify-otp` | Vérification OTP | 10/min |
| POST | `/auth/login` | Connexion | 5/min |
| POST | `/auth/refresh` | Refresh token | 100/min |
| POST | `/auth/forgot-password` | Reset password | 3/min |
| POST | `/auth/reset-password` | Nouveau mot de passe | 5/min |
| GET | `/auth/me` | Profil connecté 🔒 | 100/min |
| POST | `/auth/2fa/setup` | Setup 2FA 🔒 | 100/min |
| POST | `/auth/2fa/enable` | Activer 2FA 🔒 | 5/min |
| POST | `/auth/2fa/disable` | Désactiver 2FA 🔒 | 5/min |
| POST | `/auth/2fa/verify` | Vérifier code 2FA | 5/min |
| GET | `/auth/google` | OAuth Google | - |

### Utilisateurs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/users` | Liste utilisateurs | 🔒 Admin |
| GET | `/users/me` | Mon profil | 🔒 |
| GET | `/users/:id` | Profil par id | 🔒 Admin |
| PATCH | `/users/:id` | Modifier profil | 🔒 |
| DELETE | `/users/:id` | Supprimer compte | 🔒 |
| POST | `/users/:id/roles` | Assigner rôle | 🔒 Admin |

### Organisations

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/organizations` | Créer organisation | 🔒 |
| GET | `/organizations` | Mes organisations | 🔒 |
| GET | `/organizations/:id` | Détails | 🔒 Membre |
| PATCH | `/organizations/:id` | Modifier | 🔒 Owner/Admin |
| DELETE | `/organizations/:id` | Supprimer | 🔒 Owner |
| POST | `/organizations/:id/invite` | Inviter | 🔒 Owner/Admin |
| GET | `/organizations/accept/:token` | Accepter invitation | 🔒 |

### API Keys

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/api-keys` | Créer API key | 🔒 JWT |
| GET | `/auth/api-keys` | Lister mes keys | 🔒 JWT |
| GET | `/auth/api-keys/test` | Tester une key | 🔒 API Key |
| DELETE | `/auth/api-keys/:id` | Révoquer | 🔒 JWT |

---

## 📡 API GraphQL

Accessible sur `/graphql` avec Apollo Sandbox.

### Mutations Auth

```graphql
# Inscription
mutation {
  signup(input: {
    email: "user@example.com"
    password: "SecurePass123!"
    firstName: "John"
  }) {
    key
    message
  }
}

# Connexion
mutation {
  login(input: {
    email: "user@example.com"
    password: "SecurePass123!"
  }) {
    accessToken
    refreshToken
    requiresTwoFactor
  }
}

# Vérifier OTP
mutation {
  verifyOtp(input: {
    email: "user@example.com"
    otp: "847392"
  }) {
    key
    message
  }
}
```

### Queries

```graphql
# Profil connecté
query {
  me {
    id
    email
    firstName
    roles { role { name } }
  }
}

# Mes organisations
query {
  myOrganizations {
    id
    name
    planType
    members { role }
  }
}
```

---

## 🧪 Tests

```bash
# Tests unitaires
npm run test

# Tests avec coverage
npm run test:cov

# Tests E2E
npm run test:e2e

# Watch mode
npm run test:watch
```

### Résultats

```
Tests unitaires : 95+ tests ✅
Tests E2E       : Auth + Users + Organizations ✅
Coverage        : > 80% sur les services ✅
Approche        : TDD (Red → Green → Refactor) ✅
```

---

## 🚀 Déploiement

### Render.com (recommandé)

Le projet inclut un `render.yaml` pour déploiement automatique.

```bash
# 1. Fork le repo
# 2. Connecter à Render.com
# 3. New → Blueprint → Sélectionner le repo
# 4. Ajouter les variables d'environnement
# 5. Deploy
```

### Docker

```bash
# Build
docker build -t nestjs-saas-starter .

# Run
docker-compose up -d
```

---

## 🌱 Seed

```bash
# Crée les rôles et l'admin par défaut
npm run seed

# Compte admin par défaut
Email    : admin@nestjs-saas.com
Password : Admin123!
```

> ⚠️ Changez le mot de passe admin en production !

---

## 🤝 Contribuer

Les contributions sont bienvenues !

```bash
# Fork le projet
# Créer une branche feature
git checkout -b feature/ma-feature

# Commit avec convention
git commit -m "feat(scope): description"

# Push et Pull Request
git push origin feature/ma-feature
```

### Convention de commits

```
feat     → nouvelle fonctionnalité
fix      → correction de bug
test     → ajout de tests
docs     → documentation
refactor → refactoring
chore    → config, deps
```

---

## 📄 License

MIT © [Tsopze Nekdem Phanuel Arsene](https://phanuel-alibia.com)

---

## 👨‍💻 Auteur

<div align="center">

**Tsopze Nekdem Phanuel Arsene**

*Construit en public — Challenge 14 jours*

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0077b5?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/phanuel-tsopze-8a33a52a4/)
[![Portfolio](https://img.shields.io/badge/Portfolio-Visit-e0234e?style=for-the-badge&logo=google-chrome)](https://phanuel-alibia.com)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-181717?style=for-the-badge&logo=github)](https://github.com/alibia-phanuel)

</div>