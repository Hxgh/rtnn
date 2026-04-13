import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AccountStatus, AuthAudience, Prisma } from '@prisma/client';
import { AppConfigService } from '../../core/config/app-config.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditWriter } from '../audit/audit-writer.service';
import { AuditActor } from '../audit/audit.types';
import { LoginDto } from './dto/login.dto';
import { AuthTokenService } from './auth-token.service';
import { AuthTokens } from './auth.types';
import { LoginRateLimitService } from './login-rate-limit.service';
import { PasswordService } from './password.service';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  audience: AuthAudience;
  roles: string[];
  permissions: string[];
}

export interface AdminSessionUser extends SessionUser {
  audience: 'admin';
}

export interface CustomerSessionUser extends SessionUser {
  audience: 'customer';
}

export interface AdminSessionResponse {
  user: AdminSessionUser;
  tokens: AuthTokens;
}

export interface CustomerSessionResponse {
  user: CustomerSessionUser;
  tokens: AuthTokens;
}

export interface AdminMeResponse {
  user: AdminSessionUser;
}

export interface CustomerMeResponse {
  user: CustomerSessionUser;
}

export interface LoginRequestContext {
  ip?: string;
  userAgent?: string;
}

type PrismaExecutor = PrismaService | Prisma.TransactionClient;
type SessionResponse = AdminSessionResponse | CustomerSessionResponse;
type MeResponse = AdminMeResponse | CustomerMeResponse;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appConfigService: AppConfigService,
    private readonly authTokenService: AuthTokenService,
    private readonly passwordService: PasswordService,
    private readonly loginRateLimitService: LoginRateLimitService,
    private readonly auditWriter: AuditWriter,
  ) {}

  async login(
    dto: LoginDto,
    audience: 'admin',
    context: LoginRequestContext,
  ): Promise<AdminSessionResponse>;
  async login(
    dto: LoginDto,
    audience: 'customer',
    context: LoginRequestContext,
  ): Promise<CustomerSessionResponse>;
  async login(
    dto: LoginDto,
    audience: AuthAudience,
    context: LoginRequestContext,
  ): Promise<SessionResponse> {
    const key = this.buildRateLimitKey(dto.email, audience, context.ip);
    this.loginRateLimitService.assertAllowed(key);

    const account = await this.prisma.account.findUnique({
      where: { email: dto.email },
      include: this.getSessionInclude(audience),
    });
    if (!account) {
      this.loginRateLimitService.onFailure(key);
      await this.logLoginEvent(
        dto.email,
        audience,
        false,
        context,
        'NOT_FOUND',
      );
      throw new UnauthorizedException('Invalid credentials');
    }
    if (account.status !== AccountStatus.active) {
      this.loginRateLimitService.onFailure(key);
      await this.logLoginEvent(
        dto.email,
        audience,
        false,
        context,
        'ACCOUNT_DISABLED',
      );
      throw new ForbiddenException('Account is not active');
    }
    this.assertProfileForAudience(account, audience);

    const passwordValid = await this.passwordService.verify(
      dto.password,
      account.passwordHash,
    );
    if (!passwordValid) {
      this.loginRateLimitService.onFailure(key);
      await this.logLoginEvent(
        dto.email,
        audience,
        false,
        context,
        'INVALID_PASSWORD',
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    this.loginRateLimitService.onSuccess(key);
    const sessionUser = this.toSessionUser(account as any, audience);
    const session = await this.issueTokens(
      this.prisma,
      account.id,
      sessionUser,
      account.credentialsVersion,
    );

    await this.prisma.account.update({
      where: { id: account.id },
      data: { lastLoginAt: new Date() },
    });
    await this.logLoginEvent(
      dto.email,
      audience,
      true,
      context,
      undefined,
      account.id,
    );

    return session;
  }

  async refresh(
    refreshToken: string,
    audience: 'admin',
  ): Promise<AdminSessionResponse>;
  async refresh(
    refreshToken: string,
    audience: 'customer',
  ): Promise<CustomerSessionResponse>;
  async refresh(
    refreshToken: string,
    audience: AuthAudience,
  ): Promise<SessionResponse> {
    const payload = this.authTokenService.verifyRefreshToken(refreshToken);
    if (payload.audience !== audience) {
      throw new UnauthorizedException('Refresh token audience mismatch');
    }
    const tokenHash = this.authTokenService.hashToken(refreshToken);
    const now = new Date();
    const storedToken = await this.prisma.refreshSession.findUnique({
      where: { tokenHash },
      include: {
        account: {
          include: this.getSessionInclude(audience),
        },
      },
    });

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt <= now) {
      throw new UnauthorizedException('Refresh token is invalid or revoked');
    }
    if (
      storedToken.accountId !== payload.sub ||
      payload.sid !== storedToken.id ||
      storedToken.audience !== audience
    ) {
      throw new UnauthorizedException('Refresh token payload mismatch');
    }
    if (payload.ver !== storedToken.account.credentialsVersion) {
      throw new UnauthorizedException('Refresh token is expired');
    }
    if (storedToken.account.status !== AccountStatus.active) {
      throw new ForbiddenException('Account is not active');
    }
    this.assertProfileForAudience(storedToken.account, audience);
    const sessionUser = this.toSessionUser(
      storedToken.account as any,
      audience,
    );

    const rotated = await this.issueTokens(
      this.prisma,
      storedToken.accountId,
      sessionUser,
      storedToken.account.credentialsVersion,
      {
        replaceSessionId: storedToken.id,
      },
    );

    return rotated;
  }

  async logout(
    refreshToken: string | undefined,
    audience: AuthAudience,
  ): Promise<{ success: true }> {
    if (!refreshToken) {
      return { success: true };
    }

    let hashedToken = '';
    try {
      const payload = this.authTokenService.verifyRefreshToken(refreshToken);
      if (payload.audience !== audience) {
        return { success: true };
      }
      hashedToken = this.authTokenService.hashToken(refreshToken);
    } catch {
      return { success: true };
    }

    await this.prisma.refreshSession.updateMany({
      where: {
        tokenHash: hashedToken,
        audience,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
    return { success: true };
  }

  async me(accountId: string, audience: 'admin'): Promise<AdminSessionUser>;
  async me(
    accountId: string,
    audience: 'customer',
  ): Promise<CustomerSessionUser>;
  async me(accountId: string, audience: AuthAudience): Promise<SessionUser>;
  async me(accountId: string, audience: AuthAudience): Promise<SessionUser> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: this.getSessionInclude(audience),
    });
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    this.assertProfileForAudience(account, audience);
    return this.toSessionUser(account as any, audience);
  }

  async getMeResponse(
    accountId: string,
    audience: 'admin',
  ): Promise<AdminMeResponse>;
  async getMeResponse(
    accountId: string,
    audience: 'customer',
  ): Promise<CustomerMeResponse>;
  async getMeResponse(
    accountId: string,
    audience: AuthAudience,
  ): Promise<MeResponse>;
  async getMeResponse(
    accountId: string,
    audience: AuthAudience,
  ): Promise<MeResponse> {
    const user = await this.me(accountId, audience);
    if (audience === 'admin') {
      return {
        user: user as AdminSessionUser,
      };
    }
    return {
      user: user as CustomerSessionUser,
    };
  }

  async changePassword(
    actor: AuditActor,
    accountId: string,
    audience: 'admin',
    oldPassword: string,
    newPassword: string,
  ): Promise<AdminSessionResponse>;
  async changePassword(
    actor: AuditActor,
    accountId: string,
    audience: 'customer',
    oldPassword: string,
    newPassword: string,
  ): Promise<CustomerSessionResponse>;
  async changePassword(
    actor: AuditActor,
    accountId: string,
    audience: AuthAudience,
    oldPassword: string,
    newPassword: string,
  ): Promise<SessionResponse> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: this.getSessionInclude(audience),
    });
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    this.assertProfileForAudience(account, audience);

    const validOldPassword = await this.passwordService.verify(
      oldPassword,
      account.passwordHash,
    );
    if (!validOldPassword) {
      throw new UnauthorizedException('Old password is invalid');
    }
    if (oldPassword === newPassword) {
      throw new BadRequestException('New password must differ from current password');
    }
    const passwordHash = await this.passwordService.hash(newPassword);
    const nextCredentialsVersion = account.credentialsVersion + 1;
    const sessionUser = this.toSessionUser(account as any, audience);

    return this.prisma.$transaction(async (tx) => {
      await tx.account.update({
        where: { id: account.id },
        data: {
          passwordHash,
          credentialsVersion: {
            increment: 1,
          },
        },
      });

      await tx.refreshSession.updateMany({
        where: {
          accountId: account.id,
          audience,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      await this.auditWriter.write(
        {
          actor,
          action: 'account.password.change',
          resource: {
            type: 'account',
            id: account.id,
          },
          detail: {
            audience,
          },
        },
        tx,
      );

      return this.issueTokens(
        tx,
        account.id,
        sessionUser,
        nextCredentialsVersion,
      );
    });
  }

  private async issueTokens(
    executor: PrismaExecutor,
    accountId: string,
    sessionUser: AdminSessionUser,
    credentialsVersion: number,
    options?: { replaceSessionId?: string },
  ): Promise<AdminSessionResponse>;
  private async issueTokens(
    executor: PrismaExecutor,
    accountId: string,
    sessionUser: CustomerSessionUser,
    credentialsVersion: number,
    options?: { replaceSessionId?: string },
  ): Promise<CustomerSessionResponse>;
  private async issueTokens(
    executor: PrismaExecutor,
    accountId: string,
    sessionUser: SessionUser,
    credentialsVersion: number,
    options?: { replaceSessionId?: string },
  ): Promise<SessionResponse>;
  private async issueTokens(
    executor: PrismaExecutor,
    accountId: string,
    sessionUser: AdminSessionUser | CustomerSessionUser,
    credentialsVersion: number,
    options?: { replaceSessionId?: string },
  ): Promise<SessionResponse> {
    const sessionId = cryptoRandomId();
    const accessToken = this.authTokenService.createAccessToken({
      sub: accountId,
      email: sessionUser.email,
      name: sessionUser.name,
      audience: sessionUser.audience,
      sid: sessionId,
      ver: credentialsVersion,
      roles: sessionUser.roles,
      permissions: sessionUser.permissions,
    });
    const refresh = this.authTokenService.createRefreshToken({
      sub: accountId,
      email: sessionUser.email,
      audience: sessionUser.audience,
      sid: sessionId,
      ver: credentialsVersion,
    });

    const refreshExpiresAt = this.resolveRefreshExpiryDate();
    await executor.refreshSession.create({
      data: {
        id: sessionId,
        accountId,
        audience: sessionUser.audience,
        tokenHash: this.authTokenService.hashToken(refresh.token),
        expiresAt: refreshExpiresAt,
      },
    });
    if (options?.replaceSessionId) {
      await executor.refreshSession.update({
        where: { id: options.replaceSessionId },
        data: {
          revokedAt: new Date(),
          replacedBy: sessionId,
        },
      });
    }

    const tokens: AuthTokens = {
      accessToken,
      refreshToken: refresh.token,
      expiresIn: this.resolveDurationToSeconds(
        this.appConfigService.jwtAccessExpiresIn,
      ),
      refreshExpiresIn: this.resolveDurationToSeconds(
        this.appConfigService.jwtRefreshExpiresIn,
      ),
      tokenType: 'Bearer',
    };

    if (sessionUser.audience === 'admin') {
      return {
        user: sessionUser as AdminSessionUser,
        tokens,
      };
    }
    return {
      user: sessionUser as CustomerSessionUser,
      tokens,
    };
  }

  private resolveRefreshExpiryDate(): Date {
    const seconds = this.resolveDurationToSeconds(
      this.appConfigService.jwtRefreshExpiresIn,
    );
    return new Date(Date.now() + seconds * 1000);
  }

  private getSessionInclude(audience: AuthAudience): Prisma.AccountInclude {
    return {
      adminProfile: true,
      customerProfile: true,
      roles: {
        where: { audience },
        include: {
          role: {
            include: {
              permissionLinks: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    };
  }

  private toSessionUser(
    account: {
      id: string;
      email: string;
      adminProfile?: { name: string } | null;
      customerProfile?: { name: string } | null;
      roles: Array<{
        role: {
          slug: string;
          permissionLinks: Array<{ permission: { key: string } }>;
        };
      }>;
    },
    audience: 'admin',
  ): AdminSessionUser;
  private toSessionUser(
    account: {
      id: string;
      email: string;
      adminProfile?: { name: string } | null;
      customerProfile?: { name: string } | null;
      roles: Array<{
        role: {
          slug: string;
          permissionLinks: Array<{ permission: { key: string } }>;
        };
      }>;
    },
    audience: 'customer',
  ): CustomerSessionUser;
  private toSessionUser(
    account: {
      id: string;
      email: string;
      adminProfile?: { name: string } | null;
      customerProfile?: { name: string } | null;
      roles: Array<{
        role: {
          slug: string;
          permissionLinks: Array<{ permission: { key: string } }>;
        };
      }>;
    },
    audience: AuthAudience,
  ): SessionUser;
  private toSessionUser(
    account: {
      id: string;
      email: string;
      adminProfile?: { name: string } | null;
      customerProfile?: { name: string } | null;
      roles: Array<{
        role: {
          slug: string;
          permissionLinks: Array<{ permission: { key: string } }>;
        };
      }>;
    },
    audience: AuthAudience,
  ): SessionUser {
    const permissionSet = new Set<string>();
    const roleSet = new Set<string>();
    for (const accountRole of account.roles) {
      roleSet.add(accountRole.role.slug);
      for (const link of accountRole.role.permissionLinks) {
        permissionSet.add(link.permission.key);
      }
    }

    const profileName =
      audience === 'admin'
        ? account.adminProfile?.name
        : account.customerProfile?.name;
    return {
      id: account.id,
      email: account.email,
      name: profileName ?? account.email.split('@')[0],
      audience,
      roles: Array.from(roleSet),
      permissions: Array.from(permissionSet),
    };
  }

  private assertProfileForAudience(
    account: {
      adminProfile?: unknown | null;
      customerProfile?: { status?: string } | null;
    },
    audience: AuthAudience,
  ): void {
    if (audience === 'admin' && !account.adminProfile) {
      throw new ForbiddenException('Admin profile not found');
    }
    if (audience === 'customer') {
      if (!account.customerProfile) {
        throw new ForbiddenException('Customer profile not found');
      }
      if (account.customerProfile.status === 'blocked') {
        throw new ForbiddenException('Customer is blocked');
      }
    }
  }

  private buildRateLimitKey(
    email: string,
    audience: AuthAudience,
    ip?: string,
  ): string {
    return `${audience}:${email.toLowerCase()}:${ip ?? 'unknown-ip'}`;
  }

  private async logLoginEvent(
    email: string,
    audience: AuthAudience,
    success: boolean,
    context: LoginRequestContext,
    reason?: string,
    accountId?: string,
  ): Promise<void> {
    await this.prisma.loginEvent.create({
      data: {
        accountId,
        audience,
        email: email.toLowerCase(),
        success,
        reason,
        ip: context.ip,
        userAgent: context.userAgent,
      },
    });
  }

  private resolveDurationToSeconds(raw: string): number {
    const numeric = Number.parseInt(raw.slice(0, -1), 10);
    const unit = raw.slice(-1);
    if (Number.isNaN(numeric) || numeric < 1) {
      return 900;
    }
    if (unit === 'd') {
      return numeric * 24 * 60 * 60;
    }
    if (unit === 'h') {
      return numeric * 60 * 60;
    }
    if (unit === 'm') {
      return numeric * 60;
    }
    if (unit === 's') {
      return numeric;
    }
    return 900;
  }
}

function cryptoRandomId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}
