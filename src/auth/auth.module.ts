import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import { TwoFactorService } from './two-factor.service';
import { I18nModule } from '../i18n/i18n.module';

@Module({
  imports: [
    PrismaModule,
    I18nModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    EventEmitterModule.forRoot(),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, TwoFactorService],
  exports: [AuthService, JwtStrategy, TwoFactorService],
})
export class AuthModule {}
