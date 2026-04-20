import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { I18nService } from '../i18n/i18n.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { ApiKeyCreated, ApiKeySafe, ValidatedUser } from './types/auth.types';

// ─────────────────────────────────────────────────────

@Injectable()
export class ApiKeyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  // ── CREATE ───────────────────────────────────────

  async create(userId: string, dto: CreateApiKeyDto): Promise<ApiKeyCreated> {
    // Génère une clé aléatoire avec préfixe sk_ (comme Stripe)
    const rawKey = `sk_${crypto.randomBytes(32).toString('hex')}`;

    // Hash la clé avant de la stocker
    // Même principe que les mots de passe — on ne stocke jamais en clair
    const hashedKey = await bcrypt.hash(rawKey, 10);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        name: dto.name,
        key: hashedKey,
        userId,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    return {
      id: apiKey.id,
      name: apiKey.name,
      rawKey, // ← retourné UNE SEULE FOIS
      key: `sk_****${rawKey.slice(-4)}`, // ← version masquée
      isActive: apiKey.isActive,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    };
  }

  // ── FIND ALL BY USER ─────────────────────────────

  async findAllByUser(userId: string): Promise<ApiKeySafe[]> {
    const keys = await this.prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        isActive: true,
        lastUsed: true,
        expiresAt: true,
        createdAt: true,
        // key n'est JAMAIS retourné après la création
      },
      orderBy: { createdAt: 'desc' },
    });

    return keys;
  }

  // ── REVOKE ───────────────────────────────────────

  async revoke(
    keyId: string,
    userId: string,
  ): Promise<{ key: string; message: string }> {
    await this.prisma.apiKey.update({
      where: { id: keyId, userId },
      data: { isActive: false },
    });

    return this.i18n.createResponse('auth.api_key_revoked');
  }

  // ── VALIDATE ─────────────────────────────────────
  // Appelée par ApiKeyStrategy à chaque requête avec x-api-key

  async validate(rawKey: string): Promise<ValidatedUser | null> {
    // On récupère toutes les clés actives
    // On ne peut pas faire WHERE key = hash car bcrypt est salé différemment
    const apiKeys = await this.prisma.apiKey.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            status: true,
            emailVerified: true,
          },
        },
      },
    });

    // On compare avec bcrypt jusqu'à trouver la bonne clé
    for (const apiKey of apiKeys) {
      const isMatch = await bcrypt.compare(rawKey, apiKey.key);

      if (!isMatch) continue;

      // Clé expirée ?
      if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
        return null;
      }

      // Mise à jour du lastUsed en arrière-plan
      void this.prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsed: new Date() },
      });

      return apiKey.user;
    }

    return null;
  }
}
