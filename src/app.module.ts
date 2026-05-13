import { Module } from '@nestjs/common';
import { GraphqlModule } from './graphql/graphql.module';
import { ConfigModule } from '@nestjs/config';
import { I18nModule } from './i18n/i18n.module';
import { PrismaModule } from './prisma/prisma.module';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'path';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { throttlerConfig } from './common/config/throttler.config';
import { CommonModule } from './common/common.module';
import { GqlThrottlerGuard } from './common/guards/gql-throttler.guard';

@Module({
  imports: [
    ThrottlerModule.forRoot(throttlerConfig),
    CommonModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/graphql/schema.gql'),
      sortSchema: true,
      playground: true,
      csrfPrevention: false,
      introspection: true,
      context: ({ req }: { req: Request }) => ({ req }),
    }),
    GraphqlModule,
    OrganizationsModule,
    I18nModule,
    PrismaModule,
    AuthModule,
    MailModule,
    UsersModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: GqlThrottlerGuard,
    },
  ],
  controllers: [AppController],
})
export class AppModule {}
