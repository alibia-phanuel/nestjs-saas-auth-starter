/**
 * ============================================================
 * SERVICE — AuthService (Logique métier d'authentification)
 * ============================================================
 *
 * Ce fichier contient toute la logique métier d'authentification :
 * inscription, connexion, gestion des tokens, OTP, 2FA...
 * C'est le service central du module d'authentification.
 *
 * 💡 Rappel : un service contient la logique métier.
 *    Le contrôleur (AuthController) reçoit les requêtes HTTP
 *    et délègue tout le traitement à ce service.
 *
 * 🔧 Dépendances injectées :
 *    - PrismaService   → accès à la base de données
 *    - I18nService     → messages de réponse traduits
 *    - JwtService      → génération et vérification des tokens JWT
 *    - EventEmitter2   → déclenchement d'événements (envoi d'emails)
 *    - TwoFactorService → logique 2FA (TOTP)
 *
 * 📋 Méthodes exposées :
 *    ─────────────────────────────────────────────────────
 *    signup()          → inscription + envoi OTP par email
 *    verifyOtp()       → activation du compte via OTP
 *    forgotPassword()  → envoi OTP de réinitialisation
 *    resetPassword()   → nouveau mot de passe via OTP
 *    login()           → connexion email + mot de passe
 *    refreshToken()    → renouvellement des tokens JWT
 *    setup2FA()        → configuration du 2FA
 *    enable2FA()       → activation du 2FA
 *    disable2FA()      → désactivation du 2FA
 *    verify2FA()       → vérification code 2FA à la connexion
 *    ─────────────────────────────────────────────────────
 *
 * 🔒 Méthodes privées (helpers internes) :
 *    generateOtp()      → génère un code à 6 chiffres
 *    getOtpExpiry()     → calcule l'expiration OTP (+15 min)
 *    generateTokens()   → génère accessToken + refreshToken
 *    saveRefreshToken() → sauvegarde le refreshToken en base
 * ============================================================
 */

import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { I18nService } from '../i18n/i18n.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { User, UserStatus } from '../generated/prisma/client.js';
import { TwoFactorService } from './two-factor.service';
import { Verify2faDto } from './dto/verify-2fa.dto';
import { AuthTokens, JwtPayload, Setup2FAResult } from './types/auth.types';

// ── Types locaux ─────────────────────────────────────

/**
 * SafeUser
 *
 * Version "sécurisée" du type User de Prisma — on exclut
 * tous les champs sensibles qui ne doivent jamais sortir
 * de la base de données dans une réponse API.
 *
 * Omit<User, 'champ1' | 'champ2'> → crée un nouveau type
 * identique à User mais sans les champs listés.
 *
 * Champs exclus :
 * - password        → hash du mot de passe
 * - twoFactorSecret → secret TOTP partagé avec Google Authenticator
 * - otpCode         → code OTP en cours de validité
 * - otpExpiresAt    → date d'expiration de l'OTP
 * - resetToken      → token de réinitialisation de mot de passe
 * - resetTokenExpiry → expiration du token de réinitialisation
 */
type SafeUser = Omit<
  User,
  | 'password'
  | 'twoFactorSecret'
  | 'otpCode'
  | 'otpExpiresAt'
  | 'resetToken'
  | 'resetTokenExpiry'
>;

/**
 * LoginResponse
 *
 * Type union représentant les deux cas possibles après login() :
 *
 * Cas 1 — Connexion normale (sans 2FA) :
 *   { key, message, accessToken, refreshToken }
 *
 * Cas 2 — 2FA requis (compte avec 2FA activé) :
 *   { key, message, requiresTwoFactor: true, email }
 *   → pas de tokens JWT, le frontend doit appeler /auth/2fa/verify
 *
 * 💡 Le type union (|) force TypeScript à vérifier
 *    que tous les cas sont bien gérés dans le code.
 */
type LoginResponse =
  | ({ key: string; message: string } & AuthTokens)
  | { key: string; message: string; requiresTwoFactor: true; email: string };

// ─────────────────────────────────────────────────────

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
    private readonly jwt: JwtService,
    private readonly eventEmitter: EventEmitter2,
    private readonly twoFactor: TwoFactorService,
  ) {}

  // ══════════════════════════════════════════════════════════
  // 🔒 HELPERS PRIVÉS OTP
  // ══════════════════════════════════════════════════════════

  /**
   * generateOtp()
   *
   * Génère un code OTP aléatoire à 6 chiffres.
   *
   * 💡 Explication du calcul :
   *    Math.random()        → nombre entre 0 et 1 (ex: 0.73)
   *    * 900000             → entre 0 et 900000 (ex: 657000)
   *    + 100000             → entre 100000 et 999999 (ex: 757000)
   *    Math.floor(...)      → supprime les décimales → entier
   *    .toString()          → convertit en chaîne "757000"
   *
   *    Résultat : toujours exactement 6 chiffres (jamais 5)
   *    car on part de 100000 minimum.
   */
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * getOtpExpiry()
   *
   * Calcule la date d'expiration de l'OTP : maintenant + 15 minutes.
   * L'OTP devient invalide après ce délai même s'il n'a pas été utilisé.
   *
   * 💡 15 minutes est un compromis entre sécurité (court) et
   *    praticité (assez de temps pour lire l'email et l'utiliser).
   */
  private getOtpExpiry(): Date {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 15);
    return expiry;
  }

  // ══════════════════════════════════════════════════════════
  // 📌 signup() — Inscription d'un nouvel utilisateur
  // ══════════════════════════════════════════════════════════

  /**
   * signup()
   *
   * Inscrit un nouvel utilisateur et envoie un OTP par email
   * pour vérifier son adresse. Le compte est PENDING jusqu'à
   * la vérification.
   *
   * 🔄 Étapes :
   *    1. Vérifier que l'email n'est pas déjà utilisé
   *    2. Hasher le mot de passe avec bcrypt
   *    3. Générer un OTP et sa date d'expiration
   *    4. Créer l'utilisateur en base (statut PENDING)
   *    5. Émettre l'événement 'user.created' pour l'envoi d'email
   *    6. Retourner un message de succès + les données publiques
   *
   * @param dto → SignupDto (email, password, firstName?, lastName?)
   * @returns   → message i18n + données publiques de l'utilisateur
   * @throws ConflictException (409) si l'email est déjà utilisé
   */
  async signup(
    dto: SignupDto,
  ): Promise<{ key: string; message: string; user: Partial<SafeUser> }> {
    // Étape 1 — Vérifier l'unicité de l'email
    const existingUser: User | null = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException(
        this.i18n.createResponse('auth.email_already_exists'),
      );
    }

    // Étape 2 — Hasher le mot de passe (facteur de coût 10)
    const hashedPassword: string = await bcrypt.hash(dto.password, 10);

    // Étape 3 — Générer l'OTP et son expiration
    const otp = this.generateOtp();
    const otpExpiresAt = this.getOtpExpiry();

    /**
     * Étape 4 — Créer l'utilisateur en base
     *
     * select: { ... } → on ne récupère que les champs publics.
     * Le mot de passe hashé et l'OTP ne sont jamais retournés
     * dans la réponse — même à cette étape.
     */
    const user: Partial<SafeUser> = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword, // hash stocké, jamais la valeur brute
        firstName: dto.firstName,
        lastName: dto.lastName,
        otpCode: otp,
        otpExpiresAt,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        emailVerified: true,
        createdAt: true,
        // password → NON sélectionné (sécurité)
        // otpCode  → NON sélectionné (sécurité)
      },
    });

    /**
     * Étape 5 — Émettre l'événement 'user.created'
     *
     * EventEmitter2 déclenche de manière asynchrone tous les
     * listeners enregistrés sur 'user.created'. Dans ce projet,
     * un listener envoie l'email de confirmation avec l'OTP.
     *
     * 💡 On n'await pas ici — l'envoi d'email se fait en
     *    arrière-plan pour ne pas ralentir la réponse HTTP.
     */
    this.eventEmitter.emit('user.created', {
      email: dto.email,
      firstName: dto.firstName,
      otp, // OTP envoyé par email (jamais dans la réponse HTTP)
    });

    // Étape 6 — Retourner le message de succès + données publiques
    const response = this.i18n.createResponse('auth.signup_success');
    return { key: response.key, message: response.message, user };
  }

  // ══════════════════════════════════════════════════════════
  // 📌 verifyOtp() — Activation du compte via OTP
  // ══════════════════════════════════════════════════════════

  /**
   * verifyOtp()
   *
   * Vérifie l'OTP reçu par email et active le compte.
   * Trois vérifications sont effectuées avant activation :
   * existence du compte, validité du code, non-expiration.
   *
   * 🔄 Étapes :
   *    1. Vérifier que l'utilisateur existe
   *    2. Vérifier que l'OTP correspond
   *    3. Vérifier que l'OTP n'est pas expiré
   *    4. Activer le compte (ACTIVE + emailVerified: true)
   *    5. Effacer l'OTP (usage unique)
   *
   * 💡 On retourne le même message d'erreur ('auth.otp_invalid')
   *    que l'utilisateur soit introuvable, le code incorrect
   *    ou expiré — pour ne pas donner d'information à un attaquant.
   *
   * @param dto → VerifyOtpDto (email + otp)
   * @returns   → MessageResponse confirmant l'activation
   * @throws UnauthorizedException (401) si OTP invalide/expiré
   */
  async verifyOtp(
    dto: VerifyOtpDto,
  ): Promise<{ key: string; message: string }> {
    // Étape 1 — Vérifier que l'utilisateur existe
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.otp_invalid'),
      );
    }

    // Étape 2 — Vérifier que l'OTP correspond au code en base
    if (user.otpCode !== dto.otp) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.otp_invalid'),
      );
    }

    // Étape 3 — Vérifier que l'OTP n'est pas expiré
    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.otp_invalid'),
      );
    }

    /**
     * Étapes 4 & 5 — Activer le compte et effacer l'OTP
     *
     * UserStatus.ACTIVE → enum Prisma généré depuis le schéma
     * otpCode: null     → OTP effacé (usage unique)
     * otpExpiresAt: null → expiration effacée
     */
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        status: UserStatus.ACTIVE,
        otpCode: null, // OTP effacé après utilisation
        otpExpiresAt: null, // expiration effacée
      },
    });

    return this.i18n.createResponse('auth.otp_verified');
  }

  // ══════════════════════════════════════════════════════════
  // 📌 forgotPassword() — Demande de réinitialisation
  // ══════════════════════════════════════════════════════════

  /**
   * forgotPassword()
   *
   * Génère un OTP et l'envoie par email pour permettre
   * la réinitialisation du mot de passe.
   *
   * 🛡️ Sécurité (protection contre l'énumération) :
   *    On retourne TOUJOURS 'auth.password_reset_sent' que
   *    l'email existe ou non. Un attaquant ne peut pas
   *    savoir quels emails sont enregistrés en testant
   *    différentes adresses sur cet endpoint.
   *
   * @param email → adresse email du compte à réinitialiser
   * @returns     → MessageResponse (identique dans tous les cas)
   */
  async forgotPassword(
    email: string,
  ): Promise<{ key: string; message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    // 🛡️ Si email inexistant → même réponse (sécurité)
    if (!user) {
      return this.i18n.createResponse('auth.password_reset_sent');
    }

    // Générer et sauvegarder l'OTP de réinitialisation
    const otp = this.generateOtp();
    const otpExpiresAt = this.getOtpExpiry();

    await this.prisma.user.update({
      where: { id: user.id },
      data: { otpCode: otp, otpExpiresAt },
    });

    // Émettre l'événement pour l'envoi de l'email de réinitialisation
    this.eventEmitter.emit('password.reset', {
      email: user.email,
      firstName: user.firstName,
      otp,
    });

    return this.i18n.createResponse('auth.password_reset_sent');
  }

  // ══════════════════════════════════════════════════════════
  // 📌 resetPassword() — Définir un nouveau mot de passe
  // ══════════════════════════════════════════════════════════

  /**
   * resetPassword()
   *
   * Vérifie l'OTP de réinitialisation et met à jour le mot
   * de passe. L'OTP est effacé après usage (usage unique).
   *
   * 🔄 Étapes :
   *    1. Vérifier que l'utilisateur existe
   *    2. Vérifier que l'OTP correspond
   *    3. Vérifier que l'OTP n'est pas expiré
   *    4. Hasher le nouveau mot de passe
   *    5. Mettre à jour en base + effacer l'OTP
   *
   * @param dto → { email, otp, newPassword }
   * @returns   → MessageResponse confirmant la réinitialisation
   * @throws UnauthorizedException (401) si OTP invalide/expiré
   */
  async resetPassword(dto: {
    email: string;
    otp: string;
    newPassword: string;
  }): Promise<{ key: string; message: string }> {
    // Étape 1 — Vérifier que l'utilisateur existe
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.otp_invalid'),
      );
    }

    // Étape 2 — Vérifier que l'OTP correspond
    if (user.otpCode !== dto.otp) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.otp_invalid'),
      );
    }

    // Étape 3 — Vérifier que l'OTP n'est pas expiré
    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.otp_invalid'),
      );
    }

    // Étape 4 — Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    // Étape 5 — Mettre à jour le mot de passe et effacer l'OTP
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        otpCode: null, // OTP effacé après utilisation
        otpExpiresAt: null, // expiration effacée
      },
    });

    return this.i18n.createResponse('auth.password_reset_success');
  }

  // ══════════════════════════════════════════════════════════
  // 📌 login() — Connexion email + mot de passe
  // ══════════════════════════════════════════════════════════

  /**
   * login()
   *
   * Authentifie un utilisateur et retourne les tokens JWT.
   * Si le 2FA est activé, retourne un indicateur à la place
   * des tokens pour que le frontend appelle /auth/2fa/verify.
   *
   * 🔄 Étapes de vérification :
   *    1. Vérifier que l'utilisateur existe
   *    2. Vérifier le mot de passe avec bcrypt
   *    3. Vérifier que le compte n'est pas suspendu
   *    4. Vérifier que l'email est vérifié et le compte actif
   *    5. Si 2FA activé → retourner requiresTwoFactor: true
   *    6. Sinon → générer et retourner les tokens JWT
   *
   * 💡 On retourne toujours 'auth.invalid_credentials' en cas
   *    d'échec (utilisateur inexistant OU mauvais mot de passe)
   *    pour ne pas révéler si l'email existe en base.
   *
   * @param dto → LoginDto (email + password)
   * @returns   → AuthTokens OU { requiresTwoFactor: true, email }
   * @throws UnauthorizedException dans tous les cas d'échec
   */
  async login(dto: LoginDto): Promise<LoginResponse> {
    // Étape 1 — Vérifier que l'utilisateur existe
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.invalid_credentials'),
      );
    }

    // Étape 2 — Vérifier le mot de passe
    // user.password ?? '' → sécurité : si password est null (OAuth),
    // la comparaison retourne false sans erreur
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.password ?? '',
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.invalid_credentials'),
      );
    }

    // Étape 3 — Vérifier que le compte n'est pas suspendu
    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.account_suspended'),
      );
    }

    // Étape 4 — Vérifier que l'email est vérifié et le compte actif
    if (!user.emailVerified || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.email_not_verified'),
      );
    }

    /**
     * Étape 5 — Gestion du 2FA
     *
     * Si le 2FA est activé → on NE génère PAS les tokens.
     * On retourne un indicateur pour que le frontend sache
     * qu'il doit demander le code Google Authenticator.
     *
     * requiresTwoFactor: true as const → TypeScript traite
     * cette valeur comme le type littéral `true` (pas juste boolean)
     * ce qui permet à LoginResponse de discriminer les deux cas.
     */
    if (user.twoFactorEnabled) {
      return {
        ...this.i18n.createResponse('auth.2fa_required'),
        requiresTwoFactor: true as const,
        email: user.email,
      };
    }

    // Étape 6 — Générer les tokens et les sauvegarder
    const tokens = await this.generateTokens(user.id, user.email);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    const response = this.i18n.createResponse('auth.login_success');
    return { key: response.key, message: response.message, ...tokens };
  }

  // ══════════════════════════════════════════════════════════
  // 📌 refreshToken() — Renouvellement des tokens JWT
  // ══════════════════════════════════════════════════════════

  /**
   * refreshToken()
   *
   * Génère de nouveaux tokens à partir d'un refreshToken valide.
   * L'ancien refreshToken est révoqué (rotation des tokens).
   *
   * 🔄 Étapes :
   *    1. Trouver le refreshToken en base
   *    2. Vérifier qu'il n'est pas révoqué
   *    3. Vérifier qu'il n'est pas expiré
   *    4. Révoquer l'ancien token (isRevoked: true)
   *    5. Générer de nouveaux tokens
   *    6. Sauvegarder le nouveau refreshToken
   *
   * 💡 Rotation des tokens : à chaque renouvellement,
   *    l'ancien refreshToken est invalidé et un nouveau est
   *    créé. Si un attaquant vole un refreshToken et l'utilise,
   *    le token légitime du vrai utilisateur sera révoqué → alerte.
   *
   * @param token → refreshToken reçu du client
   * @returns     → AuthTokens avec de nouveaux tokens
   * @throws UnauthorizedException si token invalide/révoqué/expiré
   */
  async refreshToken(token: string): Promise<AuthTokens> {
    // Étape 1 — Retrouver le token en base avec son utilisateur
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    // Étape 1b — Token introuvable
    if (!stored) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.token_invalid'),
      );
    }

    // Étape 2 — Token révoqué (déjà utilisé ou déconnexion manuelle)
    if (stored.isRevoked) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.token_invalid'),
      );
    }

    // Étape 3 — Token expiré (au-delà de sa durée de validité)
    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.token_expired'),
      );
    }

    // Étape 4 — Révoquer l'ancien token (rotation)
    await this.prisma.refreshToken.update({
      where: { token },
      data: { isRevoked: true },
    });

    // Étapes 5 & 6 — Générer et sauvegarder les nouveaux tokens
    const tokens = await this.generateTokens(stored.user.id, stored.user.email);
    await this.saveRefreshToken(stored.user.id, tokens.refreshToken);

    return tokens;
  }

  // ══════════════════════════════════════════════════════════
  // 🔒 HELPERS PRIVÉS JWT
  // ══════════════════════════════════════════════════════════

  /**
   * generateTokens()
   *
   * Génère une paire de tokens JWT (access + refresh).
   *
   * 💡 Différence entre les deux tokens :
   *    - accessToken  → courte durée (défaut: 15 min)
   *                     envoyé dans chaque requête protégée
   *    - refreshToken → longue durée (défaut: 7 jours)
   *                     utilisé seulement pour renouveler l'access token
   *
   * 💡 Deux secrets différents (JWT_ACCESS_SECRET vs JWT_REFRESH_SECRET)
   *    Si un attaquant vole le secret de l'access token, il ne peut
   *    pas forger des refresh tokens (et vice versa).
   *
   * 💡 as never → contournement d'une limitation de type de @nestjs/jwt
   *    qui n'accepte pas string pour expiresIn dans certaines versions.
   *
   * @param userId → id de l'utilisateur (stocké comme `sub` dans le JWT)
   * @param email  → email de l'utilisateur
   * @returns      → AuthTokens { accessToken, refreshToken }
   */
  private async generateTokens(
    userId: string,
    email: string,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: userId, email };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? '15m') as never,
    });

    const refreshToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as never,
    });

    return { accessToken, refreshToken };
  }

  /**
   * saveRefreshToken()
   *
   * Sauvegarde le refreshToken en base de données avec
   * sa date d'expiration (maintenant + 7 jours).
   *
   * 💡 Pourquoi stocker le refreshToken en base ?
   *    Cela permet de le révoquer manuellement (déconnexion,
   *    compromission détectée) sans attendre son expiration naturelle.
   *    Un JWT seul ne peut pas être révoqué — il faut une liste noire
   *    ou une liste blanche en base pour ce contrôle.
   *
   * @param userId → id de l'utilisateur propriétaire du token
   * @param token  → refreshToken JWT à sauvegarder
   */
  private async saveRefreshToken(userId: string, token: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // expire dans 7 jours

    await this.prisma.refreshToken.create({
      data: { token, userId, expiresAt },
    });
  }

  // ══════════════════════════════════════════════════════════
  // 📌 2FA — Double authentification (TOTP)
  // ══════════════════════════════════════════════════════════

  /**
   * setup2FA()
   *
   * Délègue la configuration du 2FA à TwoFactorService.
   * Retourne le secret TOTP et le QR code à scanner.
   *
   * @param userId → id de l'utilisateur qui configure le 2FA
   * @returns      → Setup2FAResult { secret, otpauthUrl, qrCode }
   */
  async setup2FA(userId: string): Promise<Setup2FAResult> {
    return this.twoFactor.setup(userId);
  }

  /**
   * enable2FA()
   *
   * Délègue l'activation du 2FA à TwoFactorService après
   * vérification du premier code généré par Google Authenticator.
   *
   * @param userId → id de l'utilisateur
   * @param code   → code TOTP à 6 chiffres pour confirmation
   * @returns      → MessageResponse confirmant l'activation
   */
  async enable2FA(
    userId: string,
    code: string,
  ): Promise<{ key: string; message: string }> {
    return this.twoFactor.enable(userId, code);
  }

  /**
   * disable2FA()
   *
   * Délègue la désactivation du 2FA à TwoFactorService après
   * vérification d'un code valide (on ne désactive pas sans vérif).
   *
   * @param userId → id de l'utilisateur
   * @param code   → code TOTP à 6 chiffres pour confirmation
   * @returns      → MessageResponse confirmant la désactivation
   */
  async disable2FA(
    userId: string,
    code: string,
  ): Promise<{ key: string; message: string }> {
    return this.twoFactor.disable(userId, code);
  }

  /**
   * verify2FA()
   *
   * Vérifie le code 2FA après la connexion et retourne les tokens.
   * Appelé quand login() a retourné requiresTwoFactor: true.
   *
   * 🔄 Étapes :
   *    1. Vérifier que l'utilisateur existe
   *    2. Vérifier le code TOTP via TwoFactorService
   *    3. Générer et retourner les tokens JWT
   *
   * @param dto → Verify2faDto (email + code TOTP)
   * @returns   → MessageResponse + AuthTokens
   * @throws UnauthorizedException si utilisateur ou code invalide
   */
  async verify2FA(
    dto: Verify2faDto,
  ): Promise<{ key: string; message: string } & AuthTokens> {
    // Étape 1 — Vérifier que l'utilisateur existe
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: {
        id: true,
        email: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
        status: true,
        emailVerified: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.invalid_credentials'),
      );
    }

    // Étape 2 — Vérifier le code TOTP
    const isValid = await this.twoFactor.verify(dto.email, dto.code);

    if (!isValid) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.2fa_invalid'),
      );
    }

    // Étape 3 — Générer les tokens et les retourner
    const tokens = await this.generateTokens(user.id, user.email);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    const response = this.i18n.createResponse('auth.login_success');
    return { key: response.key, message: response.message, ...tokens };
  }
}
