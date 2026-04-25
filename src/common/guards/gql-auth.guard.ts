/**
 * ============================================================
 * GUARD — GqlAuthGuard (Authentification GraphQL)
 * ============================================================
 *
 * Version GraphQL du JwtAuthGuard utilisé pour REST.
 * La différence principale : on doit extraire la requête
 * depuis le contexte GraphQL plutôt que le contexte HTTP.
 *
 * 💡 Rappel Module 15 (09:52:47 Apply Authentication using Auth Guard)
 *    En REST : le context est directement la requête HTTP
 *    En GraphQL : le context est un objet { req, res, ... }
 *    qu'Apollo Server crée pour chaque requête GraphQL.
 *
 * 🔄 Flux d'authentification GraphQL :
 *    ─────────────────────────────────────────────────────
 *    1. Client envoie la requête GraphQL avec header :
 *       Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
 *    2. GqlAuthGuard intercepte via @UseGuards(GqlAuthGuard)
 *    3. getRequest() extrait req depuis le contexte GraphQL
 *    4. JwtStrategy vérifie le token et hydrate req.user
 *    5. Le resolver reçoit l'utilisateur via @GqlCurrentUser()
 *    ─────────────────────────────────────────────────────
 *
 * 💡 Pourquoi surcharger getRequest() ?
 *    AuthGuard('jwt') appelle getRequest() pour obtenir la
 *    requête HTTP. En REST, c'est automatique. En GraphQL,
 *    NestJS ne sait pas comment extraire req depuis le
 *    contexte Apollo → on doit lui indiquer manuellement.
 * ============================================================
 */

import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';

/**
 * GqlAuthGuard
 *
 * Étend AuthGuard('jwt') et surcharge getRequest()
 * pour extraire la requête depuis le contexte GraphQL.
 *
 * Utilisation dans un resolver :
 *    @UseGuards(GqlAuthGuard)
 *    @Query(() => UserType)
 *    me(@GqlCurrentUser() user: AuthenticatedUser) { ... }
 */
@Injectable()
export class GqlAuthGuard extends AuthGuard('jwt') {
  /**
   * getRequest()
   *
   * Surcharge la méthode de AuthGuard pour extraire
   * la requête HTTP depuis le contexte GraphQL Apollo.
   *
   * GqlExecutionContext.create(context) → convertit le
   * ExecutionContext NestJS en contexte GraphQL typé.
   *
   * .getContext<{ req: Request }>() → récupère le contexte
   * Apollo qui contient { req } configuré dans AppModule :
   * context: ({ req }) => ({ req })
   *
   * @param context → contexte d'exécution NestJS
   * @returns       → la requête HTTP Express
   */
  getRequest(context: ExecutionContext): Request {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext<{ req: Request }>().req;
  }
}
