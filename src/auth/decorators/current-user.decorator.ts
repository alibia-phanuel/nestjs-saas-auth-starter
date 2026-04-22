/**
 * ============================================================
 * DÉCORATEUR PERSONNALISÉ — @CurrentUser()
 * ============================================================
 *
 * Ce fichier définit un décorateur de paramètre personnalisé
 * pour NestJS.
 *
 * 💡 C'est quoi un décorateur de paramètre ?
 *    C'est un raccourci qu'on place devant un paramètre dans
 *    un contrôleur pour extraire automatiquement une valeur
 *    de la requête HTTP entrante.
 *
 *    Exemple d'utilisation dans un contrôleur :
 *    ─────────────────────────────────────────
 *    @Get('profile')
 *    @UseGuards(JwtAuthGuard)
 *    getProfile(@CurrentUser() user: JwtUser) {
 *      return user; // contient { id, email }
 *    }
 *    ─────────────────────────────────────────
 *
 * 🔄 Comment ça fonctionne ?
 *    1. Le client envoie une requête avec un Bearer Token JWT
 *    2. JwtAuthGuard intercepte la requête
 *    3. JwtStrategy.validate() vérifie le token et injecte
 *       l'utilisateur dans req.user
 *    4. @CurrentUser() extrait req.user et l'injecte directement
 *       dans le paramètre du contrôleur
 *
 * ✅ Avantage :
 *    Sans ce décorateur, il faudrait écrire à chaque fois :
 *    @Req() req: Request  puis  req.user
 *    Avec ce décorateur, on écrit simplement :
 *    @CurrentUser() user: JwtUser  → plus lisible et réutilisable
 * ============================================================
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtUser } from '../types/auth.types';

/**
 * @CurrentUser()
 *
 * Extrait l'utilisateur authentifié depuis la requête HTTP.
 * Cet utilisateur est injecté dans req.user par JwtStrategy.validate()
 * après vérification du token JWT.
 *
 * @param _data  - Non utilisé ici (paramètre requis par l'API NestJS)
 * @param ctx    - Le contexte d'exécution qui donne accès à la requête HTTP
 * @returns      - L'objet utilisateur { id, email } extrait de req.user
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtUser => {
    // On bascule vers le contexte HTTP pour accéder à l'objet Request
    const request = ctx.switchToHttp().getRequest<{ user: JwtUser }>();

    // On retourne req.user — injecté automatiquement par JwtStrategy
    return request.user;
  },
);
