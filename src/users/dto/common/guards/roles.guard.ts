/**
 * ============================================================
 * GUARD — RolesGuard (Contrôle d'accès basé sur les rôles)
 * ============================================================
 *
 * Ce guard implémente le système RBAC (Role-Based Access Control)
 * de l'application. Il vérifie que l'utilisateur connecté possède
 * au moins un des rôles requis pour accéder à une route.
 *
 * 💡 Comment ça fonctionne ?
 *    1. Le décorateur @Roles('admin', 'moderator') est placé
 *       sur un controller ou une méthode
 *    2. RolesGuard lit ces rôles via le Reflector de NestJS
 *    3. Il compare les rôles requis avec ceux de l'utilisateur
 *    4. Si l'utilisateur n'a pas le bon rôle → 403 Forbidden
 *
 * 🔗 Dépendances :
 *    - @Roles()        → décorateur qui définit les rôles requis
 *    - JwtAuthGuard    → doit être exécuté AVANT RolesGuard
 *                        pour que request.user soit disponible
 *    - ROLES_KEY       → clé de métadonnée utilisée par @Roles()
 *
 * 💡 Exemple d'utilisation :
 *
 *    @UseGuards(JwtAuthGuard, RolesGuard)
 *    @Roles('admin')
 *    @Get('admin-only')
 *    getAdminData() { ... }
 *
 * ⚠️ Important :
 *    RolesGuard doit toujours être utilisé APRÈS JwtAuthGuard.
 *    Sans JwtAuthGuard, request.user serait undefined et
 *    RolesGuard lèverait une ForbiddenException systématiquement.
 *
 * ============================================================
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RequestWithUser } from '../../../types/users.types';

@Injectable()
export class RolesGuard implements CanActivate {
  /**
   * Le Reflector est injecté par NestJS pour permettre
   * la lecture des métadonnées définies par les décorateurs
   * personnalisés comme @Roles().
   */
  constructor(private readonly reflector: Reflector) {}

  /**
   * ==========================================================
   * canActivate()
   * ==========================================================
   *
   * Méthode principale du guard — appelée automatiquement par
   * NestJS avant chaque requête protégée.
   *
   * 🔄 Logique d'exécution :
   *    1. Lecture des rôles requis via le Reflector
   *    2. Si aucun rôle requis → accès libre (return true)
   *    3. Récupération de l'utilisateur depuis la requête
   *    4. Vérification que l'utilisateur est authentifié
   *    5. Comparaison des rôles utilisateur avec les rôles requis
   *    6. Accès accordé ou ForbiddenException levée
   *
   * 💡 getAllAndOverride() vs getAllAndMerge() :
   *    - getAllAndOverride → le décorateur de la méthode
   *      écrase celui du controller (comportement voulu ici)
   *    - getAllAndMerge → fusionne les deux (utile pour
   *      accumuler des permissions)
   *
   * @param context → contexte d'exécution NestJS contenant
   *                  la requête HTTP, le handler et la classe
   * @returns true si l'accès est autorisé
   * @throws ForbiddenException si l'utilisateur n'est pas
   *         authentifié ou ne possède pas les rôles requis
   */
  canActivate(context: ExecutionContext): boolean {
    /**
     * Étape 1 : Lecture des rôles requis
     *
     * 💡 getAllAndOverride() lit les métadonnées du handler
     *    (méthode) en priorité, puis du controller si absent.
     *    Cela permet de surcharger les rôles au niveau méthode.
     */
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    /**
     * Étape 2 : Route sans restriction de rôle
     *
     * 💡 Si @Roles() n'est pas utilisé sur la route,
     *    requiredRoles sera undefined ou vide.
     *    Dans ce cas, on laisse passer la requête.
     */
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    /**
     * Étape 3 : Récupération de l'utilisateur
     *
     * 💡 request.user est peuplé par JwtAuthGuard qui doit
     *    être exécuté avant ce guard dans la chaîne de guards.
     */
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    /**
     * Étape 4 : Vérification de l'authentification
     *
     * ⚠️ Si user est undefined ici, cela signifie que
     *    JwtAuthGuard n'a pas été appliqué — configuration
     *    incorrecte des guards.
     */
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    /**
     * Étape 5 : Comparaison des rôles
     *
     * 💡 On extrait les noms de rôles de l'utilisateur
     *    depuis la relation userRole → role → name.
     *    L'opérateur ?? [] garantit un tableau vide si
     *    user.roles est undefined.
     */
    const userRoles = user.roles?.map((r) => r.role.name) ?? [];

    /**
     * some() retourne true dès qu'un rôle requis est trouvé
     * dans les rôles de l'utilisateur — logique OU inclusif.
     *
     * 💡 Exemple :
     *    requiredRoles = ['admin', 'moderator']
     *    userRoles     = ['moderator']
     *    → hasRole = true ✅
     */
    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    /**
     * Étape 6 : Décision finale
     *
     * ⚠️ On lève une ForbiddenException explicite plutôt que
     *    de retourner false — cela donne un message d'erreur
     *    clair à l'appelant au lieu d'un 403 générique.
     */
    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
