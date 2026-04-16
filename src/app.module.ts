import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { I18nModule } from './i18n/i18n.module';
import { PrismaModule } from './prisma/prisma.module';
import { AppController } from './app.controller';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    I18nModule,
    PrismaModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
