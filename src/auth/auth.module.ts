import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OAuthService } from './oauth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { TwoFactorService } from './two-factor.service';
import { PrismaModule } from '../prisma/prisma.module';
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
  providers: [
    AuthService,
    OAuthService,
    JwtStrategy,
    GoogleStrategy,
    TwoFactorService,
  ],
  exports: [
    AuthService,
    OAuthService,
    JwtStrategy,
    GoogleStrategy,
    TwoFactorService,
  ],
})
export class AuthModule {}
