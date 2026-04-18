import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Utilisation : @CurrentUser() user: User
// Extrait req.user injecté par JwtStrategy.validate()
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user: unknown }>();
    return request.user;
  },
);
