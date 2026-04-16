import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

@ApiExcludeController() // ← exclut de la doc Swagger
@Controller()
export class AppController {
  @Get()
  getHome() {
    return {
      name: 'nestjs-saas-starter',
      description:
        'Enterprise-grade SaaS starter kit — Auth, RBAC, Multi-tenancy, GraphQL, TDD',
      version: '1.0.0',
      status: 'In active development — Day 1/14',
      stack: [
        'NestJS',
        'TypeScript',
        'Prisma',
        'PostgreSQL',
        'GraphQL',
        'Docker',
        'Jest',
      ],
      features: {
        auth: [
          'Signup / Login / Logout',
          'JWT (Access + Refresh Token)',
          '2FA (Google Authenticator)',
          'OAuth (Google + Apple)',
          'API Key',
        ],
        users: ['CRUD', 'RBAC (Roles + Permissions)', 'Email activation'],
        saas: ['Multi-tenancy', 'Plans (Free, Pro, Enterprise)', 'Invitations'],
        api: ['REST (Swagger)', 'GraphQL (Apollo)'],
        quality: ['TDD', 'Test coverage > 80%', 'Docker Compose', 'CI/CD'],
      },
      links: {
        github: 'https://github.com/TON_USERNAME/nestjs-saas-auth-starter',
        documentation: '/api/docs',
        graphql: '/graphql',
      },
      author: {
        name: 'Tsopze nekdem phanuel arsene',
        linkedin: 'https://www.linkedin.com/in/phanuel-tsopze-8a33a52a4/',
        portfolio: 'https://phanuel-alibia.com/',
      },
    };
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
