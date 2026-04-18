/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { I18nService } from '../i18n/i18n.service';
import { SignupDto } from './dto/signup.dto';
import { User } from '@prisma/client';

// Type pour la réponse signup — on exclut le password et les champs sensibles
type SafeUser = Omit<
  User,
  | 'password'
  | 'twoFactorSecret'
  | 'verificationToken'
  | 'resetToken'
  | 'resetTokenExpiry'
>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  async signup(
    dto: SignupDto,
  ): Promise<{ key: string; message: string; user: Partial<SafeUser> }> {
    // 1. Vérifie si l'email existe déjà
    const existingUser: User | null = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException(
        this.i18n.createResponse('auth.email_already_exists'),
      );
    }

    // 2. Hash le mot de passe
    const hashedPassword: string = await bcrypt.hash(dto.password, 10);

    // 3. Crée l'utilisateur — password exclu du select
    const user: Partial<SafeUser> = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    // 4. Réponse i18n standardisée
    const response = this.i18n.createResponse('auth.signup_success');

    return {
      key: response.key,
      message: response.message,
      user,
    };
  }
}
