# nestjs-saas-auth-starter

> Starter kit NestJS enterprise-grade pour applications SaaS

## Stack technique

- **Framework** : NestJS (TypeScript)
- **Base de données** : PostgreSQL + Prisma ORM
- **API** : REST (Swagger) + GraphQL (Apollo)
- **Auth** : JWT, OAuth2, 2FA, API Key
- **Tests** : Jest (TDD) + E2E
- **Infrastructure** : Docker Compose

## Fonctionnalités

- 🔐 Auth complète (JWT, Refresh Token, 2FA, OAuth Google)
- 👥 Gestion utilisateurs + RBAC
- 🏢 Multi-tenancy (organisations)
- 📦 Plans SaaS (Free, Pro, Enterprise)
- 🌍 Message Keys (i18n-ready)
- 📡 API REST + GraphQL
- 🧪 TDD (Red → Green → Refactor)

## Démarrage rapide

```bash
# Cloner le projet
git clone https://github.com/TON_USERNAME/nestjs-saas-auth-starter.git
cd nestjs-saas-auth-starter

# Installer les dépendances
npm install

# Configurer l'environnement
cp .env.example .env

# Lancer la base de données
docker-compose up -d

# Lancer en développement
npm run start:dev
```

## Structure du projet

src/
├── auth/           → Authentification complète
├── users/          → Gestion utilisateurs
├── organizations/  → Multi-tenancy
├── roles/          → RBAC
├── plans/          → Plans SaaS
├── graphql/        → API GraphQL
├── i18n/           → Message Keys
├── mail/           → Emails transactionnels
├── common/         → Utilitaires partagés
└── prisma/         → Client base de données

## Développement

```bash
npm run start:dev     # Développement
npm run test          # Tests unitaires
npm run test:e2e      # Tests E2E
npm run test:cov      # Couverture de tests
```

## Licence

MIT