import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest } from './access-token.guard';
import { AuthSessionUser } from './auth-session-user';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthSessionUser | undefined => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);
