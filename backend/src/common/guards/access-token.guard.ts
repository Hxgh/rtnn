import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthTokenService } from '../../modules/auth/auth-token.service';
import { AuthSessionUser } from './auth-session-user';
import { IS_PUBLIC_KEY } from './public.decorator';
import { PrismaService } from '../../core/prisma/prisma.service';

export interface AuthenticatedRequest extends Request {
  user?: AuthSessionUser;
}

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authTokenService: AuthTokenService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.header('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = authorization.slice(7).trim();
    const payload = this.authTokenService.verifyAccessToken(token);
    const account = await this.prisma.account.findUnique({
      where: { id: payload.sub },
      select: {
        status: true,
        credentialsVersion: true,
        adminProfile: {
          select: {
            id: true,
          },
        },
        customerProfile: {
          select: {
            status: true,
          },
        },
      },
    });
    if (!account) {
      throw new UnauthorizedException('Account not found');
    }
    if (account.status !== 'active') {
      throw new ForbiddenException('Account is not active');
    }
    if (payload.ver !== account.credentialsVersion) {
      throw new UnauthorizedException('Session is expired');
    }
    if (payload.audience === 'admin' && !account.adminProfile) {
      throw new ForbiddenException('Admin profile not found');
    }
    if (payload.audience === 'customer') {
      if (!account.customerProfile) {
        throw new ForbiddenException('Customer profile not found');
      }
      if (account.customerProfile.status === 'blocked') {
        throw new ForbiddenException('Customer is blocked');
      }
    }
    request.user = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      audience: payload.audience,
      sid: payload.sid,
      roles: payload.roles,
      permissions: payload.permissions,
    };
    return true;
  }
}
