/**
 * ============================================================
 * DECORATOR — GqlCurrentUser
 * ============================================================
 *
 * Version GraphQL du décorateur @CurrentUser() utilisé en REST.
 * Extrait l'utilisateur authentifié depuis le contexte GraphQL.
 *
 * 💡 Rappel Module 20 (12:56:12 Custom Decorator)
 *    createParamDecorator() crée un décorateur de paramètre
 *    personnalisé. En REST, on extrait req.user depuis le
 *    contexte HTTP. En GraphQL, on l'extrait depuis le
 *    contexte Apollo.
 *
 * 💡 Rappel Module 15 (09:52:47) — même principe que pour
 *    GqlAuthGuard : le contexte GraphQL est différent du
 *    contexte REST, il faut adapter l'extraction.
 *
 * Utilisation dans un resolver :
 *    @Query(() => UserType)
 *    @UseGuards(GqlAuthGuard)
 *    me(@GqlCurrentUser() user: AuthenticatedUser) {
 *      return user; // injecté automatiquement depuis req.user
 *    }
 * ============================================================
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

/** Type de l'utilisateur injecté dans le contexte GraphQL */
interface GqlContext {
  req: {
    user: unknown;
  };
}

/**
 * GqlCurrentUser
 *
 * Décorateur de paramètre qui extrait req.user depuis
 * le contexte GraphQL Apollo et l'injecte dans le paramètre
 * du resolver où il est appliqué.
 *
 * req.user est hydraté par JwtStrategy.validate() après
 * vérification du token JWT par GqlAuthGuard.
 */
export const GqlCurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    // Convertit le contexte NestJS en contexte GraphQL
    const ctx = GqlExecutionContext.create(context);
    // Extrait req.user depuis le contexte Apollo
    return ctx.getContext<GqlContext>().req.user;
  },
);
