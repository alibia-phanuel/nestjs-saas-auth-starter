/**
 * ============================================================
 * SERVICE — TwoFactorService (Double authentification TOTP)
 * ============================================================
 *
 * Ce fichier contient toute la logique de la double authentification
 * basée sur le protocole TOTP (Time-based One-Time Password).
 *
 * 💡 C'est quoi le TOTP ?
 *    TOTP est un algorithme qui génère des codes à 6 chiffres
 *    qui changent toutes les 30 secondes. Il est basé sur :
 *    - Un secret partagé (stocké en base + dans l'app mobile)
 *    - L'heure actuelle (d'où "Time-based")
 *    Le serveur et l'application mobile génèrent le même code
 *    au même moment grâce au secret partagé.
 *
 * 🔧 Bibliothèques utilisées :
 *    - speakeasy → génération et vérification des codes TOTP
 *    - qrcode    → conversion de l'URL otpauth en image QR code
 *
 * 🔧 Dépendances injectées :
 *    - PrismaService → accès à la base de données
 *    - I18nService   → messages de réponse traduits
 *
 * 📋 Méthodes exposées :
 *    - setup()   → générer le secret + QR code (configuration)
 *    - enable()  → activer le 2FA après scan du QR code
 *    - disable() → désactiver le 2FA avec vérification du code
 *    - verify()  → vérifier un code TOTP lors de la connexion
 *
 * 🔄 Flux complet d'activation du 2FA :
 *    ─────────────────────────────────────────────────────
 *    1. setup()   → génère secret + QR code → l'utilisateur scanne
 *    2. enable()  → vérifie le premier code → active le 2FA
 *    3. (à chaque connexion) verify() → vérifie le code du login
 *    4. disable() → vérifie un code → désactive le 2FA
 *    ─────────────────────────────────────────────────────
 * ============================================================
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { I18nService } from '../i18n/i18n.service';
import { Setup2FAResult, MessageResponse } from './types/auth.types';

@Injectable()
export class TwoFactorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  // ══════════════════════════════════════════════════════════
  // 📌 setup() — Configurer le 2FA (générer secret + QR code)
  // ══════════════════════════════════════════════════════════

  /**
   * setup()
   *
   * Génère un secret TOTP et un QR code pour configurer
   * Google Authenticator. Le 2FA n'est pas encore actif —
   * l'utilisateur doit scanner le QR code puis confirmer
   * avec enable() en envoyant son premier code.
   *
   * 🔄 Étapes :
   *    1. Vérifier que l'utilisateur existe
   *    2. Générer un secret base32 avec speakeasy
   *    3. Sauvegarder le secret en base (pas encore actif)
   *    4. Convertir l'URL otpauth en image QR code
   *    5. Retourner secret + URL + QR code
   *
   * 💡 Pourquoi stocker le secret avant enable() ?
   *    On doit stocker le secret pour pouvoir le vérifier
   *    dans enable(). Si l'utilisateur abandonne le setup,
   *    le secret reste en base mais le 2FA reste inactif
   *    (twoFactorEnabled: false) — il n'y a pas de risque.
   *
   * @param userId → id de l'utilisateur qui configure le 2FA
   * @returns      → Setup2FAResult { secret, otpauthUrl, qrCode }
   * @throws UnauthorizedException si l'utilisateur est introuvable
   */
  async setup(userId: string): Promise<Setup2FAResult> {
    // Étape 1 — Vérifier que l'utilisateur existe
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new UnauthorizedException(
        this.i18n.createResponse('users.not_found'),
      );
    }

    /**
     * Étape 2 — Générer le secret TOTP avec speakeasy
     *
     * speakeasy.generateSecret() retourne un objet contenant
     * plusieurs encodages du secret et l'URL otpauth.
     *
     * name: `nestjs-saas-starter (email)` → nom affiché dans
     * Google Authenticator pour identifier le compte.
     * length: 20 → longueur du secret en octets (160 bits)
     *              valeur recommandée par la RFC 6238.
     *
     * secretObj.base32   → secret encodé en base32 (à stocker)
     * secretObj.otpauth_url → URL otpauth:// (à encoder en QR)
     */
    const secretObj = speakeasy.generateSecret({
      name: `nestjs-saas-starter (${user.email})`,
      length: 20,
    });

    const secret = secretObj.base32;
    const otpauthUrl = secretObj.otpauth_url ?? '';

    // Étape 3 — Sauvegarder le secret en base (2FA pas encore actif)
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    /**
     * Étape 4 — Convertir l'URL otpauth en image QR code
     *
     * QRCode.toDataURL() génère une image PNG encodée en base64.
     * Le frontend affiche cette image → l'utilisateur la scanne
     * avec Google Authenticator.
     *
     * Format retourné : 'data:image/png;base64,iVBORw0KGgo...'
     */
    const qrCode = await QRCode.toDataURL(otpauthUrl);

    // Étape 5 — Retourner les données nécessaires au frontend
    return { secret, otpauthUrl, qrCode };
  }

  // ══════════════════════════════════════════════════════════
  // 📌 enable() — Activer le 2FA après scan du QR code
  // ══════════════════════════════════════════════════════════

  /**
   * enable()
   *
   * Active le 2FA après que l'utilisateur a scanné le QR code
   * et prouve que son application génère des codes valides.
   * Cette confirmation est obligatoire pour éviter que l'utilisateur
   * active le 2FA avec un QR code mal scanné (il serait bloqué).
   *
   * 🔄 Étapes :
   *    1. Vérifier que l'utilisateur existe et a un secret
   *    2. Vérifier le code TOTP soumis
   *    3. Activer le 2FA (twoFactorEnabled: true)
   *
   * 💡 window: 1 → tolérance de ±30 secondes
   *    Les horloges du serveur et du téléphone peuvent avoir
   *    un léger décalage. window: 1 accepte le code de la
   *    période précédente et de la période suivante.
   *
   * @param userId → id de l'utilisateur
   * @param code   → code TOTP à 6 chiffres saisi par l'utilisateur
   * @returns      → MessageResponse confirmant l'activation
   * @throws UnauthorizedException si utilisateur ou code invalide
   */
  async enable(userId: string, code: string): Promise<MessageResponse> {
    // Étape 1 — Vérifier que l'utilisateur existe et a un secret
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user) {
      throw new UnauthorizedException(
        this.i18n.createResponse('users.not_found'),
      );
    }

    // Pas de secret → setup() n'a pas été appelé avant enable()
    if (!user.twoFactorSecret) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.2fa_invalid'),
      );
    }

    /**
     * Étape 2 — Vérifier le code TOTP avec speakeasy
     *
     * speakeasy.totp.verify() recalcule le code attendu
     * à partir du secret et de l'heure actuelle, puis
     * le compare avec le code soumis.
     *
     * secret:   → le secret partagé stocké en base
     * encoding: 'base32' → format du secret stocké
     * token:    → code soumis par l'utilisateur
     * window: 1 → tolérance de ±30 secondes (décalage d'horloge)
     */
    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!isValid) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.2fa_invalid'),
      );
    }

    // Étape 3 — Activer le 2FA sur le compte
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    return this.i18n.createResponse('auth.2fa_enabled');
  }

  // ══════════════════════════════════════════════════════════
  // 📌 disable() — Désactiver le 2FA
  // ══════════════════════════════════════════════════════════

  /**
   * disable()
   *
   * Désactive le 2FA sur le compte après vérification d'un
   * code valide. La vérification est obligatoire — on ne peut
   * pas désactiver le 2FA sans prouver qu'on y a toujours accès
   * (protection contre une désactivation par un attaquant).
   *
   * 🔄 Étapes :
   *    1. Vérifier que l'utilisateur a bien un secret 2FA actif
   *    2. Vérifier le code TOTP soumis
   *    3. Désactiver le 2FA et effacer le secret
   *
   * 💡 twoFactorSecret: null → on efface le secret en base.
   *    Si l'utilisateur veut réactiver le 2FA plus tard,
   *    il devra recommencer depuis setup() pour générer
   *    un nouveau secret et rescanner un QR code.
   *
   * @param userId → id de l'utilisateur
   * @param code   → code TOTP à 6 chiffres pour confirmation
   * @returns      → MessageResponse confirmant la désactivation
   * @throws UnauthorizedException si utilisateur ou code invalide
   */
  async disable(userId: string, code: string): Promise<MessageResponse> {
    // Étape 1 — Vérifier que l'utilisateur a un secret 2FA
    // user?.twoFactorSecret → si user est null OU secret est null → exception
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user?.twoFactorSecret) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.2fa_invalid'),
      );
    }

    // Étape 2 — Vérifier le code TOTP
    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!isValid) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.2fa_invalid'),
      );
    }

    /**
     * Étape 3 — Désactiver le 2FA et effacer le secret
     *
     * twoFactorEnabled: false → le 2FA ne sera plus demandé à la connexion
     * twoFactorSecret: null   → le secret est effacé de la base
     *                           (sécurité : inutile de le garder)
     */
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    return this.i18n.createResponse('auth.2fa_disabled');
  }

  // ══════════════════════════════════════════════════════════
  // 📌 verify() — Vérifier un code TOTP lors de la connexion
  // ══════════════════════════════════════════════════════════

  /**
   * verify()
   *
   * Vérifie un code TOTP lors de la connexion (après login()).
   * Appelée par AuthService.verify2FA() quand l'utilisateur
   * soumet son code Google Authenticator.
   *
   * 💡 Différence avec enable() et disable() :
   *    - enable/disable → reçoivent un userId (utilisateur connecté)
   *    - verify()       → reçoit un email (utilisateur pas encore
   *                       connecté — pas de token JWT disponible)
   *
   * 💡 Retourne boolean plutôt que lever une exception.
   *    C'est AuthService.verify2FA() qui décide quoi faire
   *    avec ce résultat (lever ou non l'exception).
   *
   * @param email → email de l'utilisateur qui tente de se connecter
   * @param code  → code TOTP à 6 chiffres soumis par l'utilisateur
   * @returns     → true si le code est valide, false sinon
   */
  async verify(email: string, code: string): Promise<boolean> {
    // Récupérer uniquement le secret — on ne charge pas tout l'utilisateur
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { twoFactorSecret: true },
    });

    // Pas d'utilisateur ou pas de secret → code invalide
    if (!user?.twoFactorSecret) {
      return false;
    }

    // Vérifier le code TOTP avec speakeasy
    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1, // tolérance de ±30 secondes
    });

    return isValid;
  }
}
