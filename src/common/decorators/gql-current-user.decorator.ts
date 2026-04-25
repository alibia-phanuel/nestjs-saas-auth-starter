import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

interface GqlContext {
  req: {
    user: unknown;
  };
}

// Rappel Module 20 (12:56:12 Custom Decorator)
// Version GraphQL du décorateur @CurrentUser REST
export const GqlCurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext<GqlContext>().req.user;
  },
);
