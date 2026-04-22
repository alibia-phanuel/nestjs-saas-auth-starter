/**
 * ============================================================
 * SERVICE — ApiKeyService (Logique métier des clés API)
 * ============================================================
 *
 * Ce fichier contient toute la logique métier liée aux clés API :
 * création, liste, révocation et validation.
 *
 * 💡 C'est quoi un service dans NestJS ?
 *    Un service contient la logique métier de l'application.
 *    Il est séparé du contrôleur (qui gère les requêtes HTTP)
 *    pour respecter le principe de responsabilité unique :
 *    - Contrôleur → reçoit la requête, retourne la réponse
 *    - Service    → contient la logique, interagit avec la base
 *
 * 🔧 Dépendances injectées :
 *    - PrismaService → accès à la base de données
 *    - I18nService   → messages de réponse traduits
 *
 * 📋 Méthodes exposées :
 *    - create()         → créer une clé API hashée
 *    - findAllByUser()  → lister les clés d'un utilisateur
 *    - revoke()         → désactiver une clé API
 *    - validate()       → vérifier une clé API entrante
 *
 * 🛡️ Sécurité des clés API :
 *    Le même principe que les mots de passe est appliqué :
 *    la clé brute n'est JAMAIS stockée en clair en base.
 *    Seul son hash bcrypt est stocké. La clé brute est
 *    retournée une seule fois à la création, puis perdue.
 * ============================================================
 */

import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { I18nService } from '../i18n/i18n.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { ApiKeyCreated, ApiKeySafe, ValidatedUser } from './types/auth.types';

/**
 * @Injectable()
 * Permet à NestJS d'injecter automatiquement PrismaService
 * et I18nService via le constructeur.
 */
@Injectable()
export class ApiKeyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  // ══════════════════════════════════════════════════════════
  // 📌 create() — Créer une nouvelle clé API
  // ══════════════════════════════════════════════════════════

  /**
   * create()
   *
   * Génère une nouvelle clé API sécurisée, la hashe et la
   * sauvegarde en base. Retourne la clé brute UNE SEULE FOIS.
   *
   * 🔄 Étapes de création :
   *    1. Générer une clé aléatoire avec préfixe sk_
   *    2. Hasher la clé avec bcrypt (comme un mot de passe)
   *    3. Sauvegarder le HASH en base (jamais la clé brute)
   *    4. Retourner la clé brute + une version masquée
   *
   * 💡 Pourquoi le préfixe sk_ ?
   *    C'est une convention popularisée par Stripe. Le préfixe
   *    permet d'identifier visuellement une clé API (sk_ = secret key)
   *    et de la distinguer d'autres types de tokens.
   *
   * 💡 Pourquoi bcrypt pour les clés API ?
   *    Même principe que les mots de passe — si la base de données
   *    est compromise, l'attaquant ne récupère que des hashes
   *    impossibles à inverser, pas les clés brutes.
   *
   * @param userId → id de l'utilisateur propriétaire de la clé
   * @param dto    → données de création (name, expiresAt?)
   * @returns      → ApiKeyCreated avec rawKey (une seule fois)
   */
  async create(userId: string, dto: CreateApiKeyDto): Promise<ApiKeyCreated> {
    /**
     * Génération de la clé brute
     *
     * crypto.randomBytes(32) → génère 32 octets aléatoires
     *   cryptographiquement sécurisés (256 bits d'entropie)
     * .toString('hex') → convertit en chaîne hexadécimale de 64 caractères
     *
     * Résultat : sk_a3f8c2d1e9b7... (68 caractères au total)
     */
    const rawKey = `sk_${crypto.randomBytes(32).toString('hex')}`;

    /**
     * Hashage de la clé avec bcrypt
     *
     * Le facteur de coût 10 correspond à 2^10 = 1024 itérations
     * de hashage. C'est la valeur recommandée qui offre un bon
     * équilibre entre sécurité et performance.
     *
     * ⚠️ bcrypt est salé différemment à chaque appel — deux hashes
     * de la même clé seront différents. C'est pourquoi on ne peut
     * pas faire WHERE key = hash dans validate() (voir ci-dessous).
     */
    const hashedKey = await bcrypt.hash(rawKey, 10);

    // Sauvegarde en base avec le HASH (jamais la clé brute)
    const apiKey = await this.prisma.apiKey.create({
      data: {
        name: dto.name,
        key: hashedKey, // hash stocké
        userId,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    return {
      id: apiKey.id,
      name: apiKey.name,
      rawKey, // ⚠️ retourné UNE SEULE FOIS
      key: `sk_****${rawKey.slice(-4)}`, // version masquée (ex: sk_****ef01)
      isActive: apiKey.isActive,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    };
  }

  // ══════════════════════════════════════════════════════════
  // 📌 findAllByUser() — Lister les clés d'un utilisateur
  // ══════════════════════════════════════════════════════════

  /**
   * findAllByUser()
   *
   * Retourne toutes les clés API d'un utilisateur sans
   * jamais exposer la clé brute ou son hash.
   *
   * 💡 select: { key: false } (implicite)
   *    En ne sélectionnant pas le champ key dans select,
   *    Prisma ne le retourne pas — même le hash ne sort
   *    jamais de la base après la création.
   *
   * orderBy: { createdAt: 'desc' } → les clés les plus
   * récentes apparaissent en premier dans la liste.
   *
   * @param userId → id de l'utilisateur dont on liste les clés
   * @returns      → tableau de ApiKeySafe (sans rawKey ni hash)
   */
  async findAllByUser(userId: string): Promise<ApiKeySafe[]> {
    const keys = await this.prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        isActive: true,
        lastUsed: true, // pratique pour auditer l'usage
        expiresAt: true,
        createdAt: true,
        // key → NON sélectionné : le hash ne sort jamais après création
      },
      orderBy: { createdAt: 'desc' }, // plus récentes en premier
    });

    return keys;
  }

  // ══════════════════════════════════════════════════════════
  // 📌 revoke() — Révoquer une clé API
  // ══════════════════════════════════════════════════════════

  /**
   * revoke()
   *
   * Désactive une clé API en passant isActive à false.
   * La clé reste en base (pour l'historique) mais ne peut
   * plus être utilisée pour s'authentifier.
   *
   * 💡 where: { id: keyId, userId } → double vérification
   *    On filtre à la fois par l'id de la clé ET par l'id
   *    de l'utilisateur. Cela empêche un utilisateur de
   *    révoquer les clés d'un autre utilisateur, même s'il
   *    connaît leur id.
   *
   * @param keyId  → id de la clé à révoquer
   * @param userId → id de l'utilisateur propriétaire
   * @returns      → message de confirmation traduit (i18n)
   */
  async revoke(
    keyId: string,
    userId: string,
  ): Promise<{ key: string; message: string }> {
    await this.prisma.apiKey.update({
      where: { id: keyId, userId }, // sécurité : vérifie la propriété
      data: { isActive: false }, // désactivation de la clé
    });

    // Retourne un message traduit via i18n
    return this.i18n.createResponse('auth.api_key_revoked');
  }

  // ══════════════════════════════════════════════════════════
  // 📌 validate() — Vérifier une clé API entrante
  // ══════════════════════════════════════════════════════════

  /**
   * validate()
   *
   * Vérifie qu'une clé API brute est valide et retourne
   * l'utilisateur associé. Appelée par ApiKeyStrategy
   * à chaque requête authentifiée par x-api-key.
   *
   * ⚠️ Pourquoi récupérer TOUTES les clés actives ?
   *    bcrypt génère un salt aléatoire à chaque hashage.
   *    Cela signifie que bcrypt.hash('sk_abc') donne un
   *    résultat différent à chaque appel. On ne peut donc
   *    pas faire WHERE key = bcrypt.hash(rawKey) en SQL.
   *    La seule solution est de récupérer toutes les clés
   *    actives et de tester avec bcrypt.compare() jusqu'à
   *    trouver la correspondance.
   *
   * 💡 Impact sur les performances :
   *    Cette approche est O(n) — elle ralentit à mesure que
   *    le nombre de clés actives augmente. En production avec
   *    beaucoup de clés, on peut stocker un préfixe non hashé
   *    (ex: les 8 premiers caractères) pour filtrer en SQL
   *    avant de faire bcrypt.compare().
   *
   * 🔄 Étapes de validation :
   *    1. Récupérer toutes les clés actives avec leur utilisateur
   *    2. Pour chaque clé, comparer avec bcrypt.compare()
   *    3. Si correspondance trouvée → vérifier l'expiration
   *    4. Mettre à jour lastUsed en arrière-plan (void)
   *    5. Retourner l'utilisateur associé
   *
   * 💡 void this.prisma.apiKey.update(...)
   *    Le mot-clé void indique qu'on ne veut pas attendre
   *    la fin de cette opération (pas de await). La mise à
   *    jour de lastUsed se fait en arrière-plan pour ne pas
   *    ralentir la réponse. C'est acceptable car lastUsed
   *    n'est pas critique pour la sécurité.
   *
   * @param rawKey → clé brute extraite du header x-api-key
   * @returns      → ValidatedUser si valide, null sinon
   */
  async validate(rawKey: string): Promise<ValidatedUser | null> {
    // Étape 1 — Récupérer toutes les clés actives avec leur utilisateur
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

    // Étape 2 — Comparer la clé brute avec chaque hash stocké
    for (const apiKey of apiKeys) {
      const isMatch = await bcrypt.compare(rawKey, apiKey.key);

      // Pas de correspondance → on passe à la clé suivante
      if (!isMatch) continue;

      // Étape 3 — Vérifier que la clé n'est pas expirée
      // expiresAt < new Date() → la date d'expiration est dans le passé
      if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
        return null; // clé expirée → accès refusé
      }

      // Étape 4 — Mettre à jour lastUsed en arrière-plan
      // void = on ne await pas → la réponse n'attend pas cette opération
      void this.prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsed: new Date() },
      });

      // Étape 5 — Retourner l'utilisateur associé à la clé
      return apiKey.user;
    }

    // Aucune clé correspondante trouvée → accès refusé
    return null;
  }
}
