import { Injectable } from '@nestjs/common';
import { AccountStatus, AuthAudience, Prisma } from '@prisma/client';
import { AUDIT_ACTIONS } from '@rtnn/shared-types';
import { AppConfigService } from '../../core/config/app-config.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditWriter } from '../audit/audit-writer.service';
import { AuditActor } from '../audit/audit.types';
import {
  apiBadRequest,
  apiForbidden,
  apiNotFound,
  apiUnauthorized,
} from '../../common/errors/api-error';
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
const sessionRoleInclude = {
  role: {
    include: {
      permissionLinks: {
        include: {
          permission: true,
        },
      },
    },
  },
} satisfies Prisma.AccountRoleInclude;

type SessionAccountRecord = Prisma.AccountGetPayload<{
  include: {
    adminProfile: true;
    customerProfile: true;
    roles: {
      include: typeof sessionRoleInclude;
    };
  };
}>;

const createSessionInclude = (audience: AuthAudience) =>
  ({
    adminProfile: true,
    customerProfile: true,
    roles: {
      where: { audience },
      include: sessionRoleInclude,
    },
  }) satisfies Prisma.AccountInclude;

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
    try {
      this.loginRateLimitService.assertAllowed(key);
    } catch (error) {
      await this.writeLoginRateLimitedAudit(
        dto.email,
        audience,
        context,
        'LOGIN_RATE_LIMITED',
      );
      throw error;
    }

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
      await this.writeLoginFailureAudit(
        dto.email,
        audience,
        'failure',
        context,
        'NOT_FOUND',
      );
      throw apiUnauthorized('INVALID_CREDENTIALS', 'Invalid credentials');
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
      await this.writeLoginFailureAudit(
        dto.email,
        audience,
        'denied',
        context,
        'ACCOUNT_DISABLED',
        account.id,
      );
      throw apiForbidden('ACCOUNT_NOT_ACTIVE', 'Account is not active');
    }
    try {
      this.assertProfileForAudience(account, audience);
    } catch (error) {
      this.loginRateLimitService.onFailure(key);
      await this.logLoginEvent(
        dto.email,
        audience,
        false,
        context,
        'PROFILE_DENIED',
        account.id,
      );
      await this.writeLoginFailureAudit(
        dto.email,
        audience,
        'denied',
        context,
        this.resolveLoginProfileDeniedReason(error),
        account.id,
      );
      throw error;
    }

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
      await this.writeLoginFailureAudit(
        dto.email,
        audience,
        'failure',
        context,
        'INVALID_PASSWORD',
        account.id,
      );
      throw apiUnauthorized('INVALID_CREDENTIALS', 'Invalid credentials');
    }

    this.loginRateLimitService.onSuccess(key);
    const sessionUser = this.toSessionUser(account, audience);
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
      throw apiUnauthorized(
        'REFRESH_TOKEN_AUDIENCE_MISMATCH',
        'Refresh token audience mismatch',
      );
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
      throw apiUnauthorized(
        'REFRESH_TOKEN_INVALID_OR_REVOKED',
        'Refresh token is invalid or revoked',
      );
    }
    if (
      storedToken.accountId !== payload.sub ||
      payload.sid !== storedToken.id ||
      storedToken.audience !== audience
    ) {
      throw apiUnauthorized(
        'REFRESH_TOKEN_PAYLOAD_MISMATCH',
        'Refresh token payload mismatch',
      );
    }
    if (payload.ver !== storedToken.account.credentialsVersion) {
      throw apiUnauthorized(
        'REFRESH_TOKEN_EXPIRED',
        'Refresh token is expired',
      );
    }
    if (storedToken.account.status !== AccountStatus.active) {
      throw apiForbidden('ACCOUNT_NOT_ACTIVE', 'Account is not active');
    }
    this.assertProfileForAudience(storedToken.account, audience);
    const sessionUser = this.toSessionUser(storedToken.account, audience);

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
      throw apiNotFound('ACCOUNT_NOT_FOUND', 'Account not found');
    }
    this.assertProfileForAudience(account, audience);
    return this.toSessionUser(account, audience);
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
      throw apiNotFound('ACCOUNT_NOT_FOUND', 'Account not found');
    }
    this.assertProfileForAudience(account, audience);

    const validOldPassword = await this.passwordService.verify(
      oldPassword,
      account.passwordHash,
    );
    if (!validOldPassword) {
      throw apiUnauthorized('OLD_PASSWORD_INVALID', 'Old password is invalid');
    }
    if (oldPassword === newPassword) {
      throw apiBadRequest(
        'NEW_PASSWORD_MUST_DIFFER',
        'New password must differ from current password',
      );
    }
    const passwordHash = await this.passwordService.hash(newPassword);
    const nextCredentialsVersion = account.credentialsVersion + 1;
    const sessionUser = this.toSessionUser(account, audience);

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
          action: AUDIT_ACTIONS.accountPasswordChange,
          resource: {
            type: 'account',
            id: account.id,
            name: account.email,
          },
          detail: {
            audience,
            passwordChanged: true,
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
        user: sessionUser,
        tokens,
      };
    }
    return {
      user: sessionUser,
      tokens,
    };
  }

  private resolveRefreshExpiryDate(): Date {
    const seconds = this.resolveDurationToSeconds(
      this.appConfigService.jwtRefreshExpiresIn,
    );
    return new Date(Date.now() + seconds * 1000);
  }

  private getSessionInclude(audience: AuthAudience) {
    return createSessionInclude(audience);
  }

  private toSessionUser(
    account: SessionAccountRecord,
    audience: 'admin',
  ): AdminSessionUser;
  private toSessionUser(
    account: SessionAccountRecord,
    audience: 'customer',
  ): CustomerSessionUser;
  private toSessionUser(
    account: SessionAccountRecord,
    audience: AuthAudience,
  ): SessionUser;
  private toSessionUser(
    account: SessionAccountRecord,
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
    account: Pick<SessionAccountRecord, 'adminProfile' | 'customerProfile'>,
    audience: AuthAudience,
  ): void {
    if (audience === 'admin' && !account.adminProfile) {
      throw apiForbidden('ADMIN_PROFILE_NOT_FOUND', 'Admin profile not found');
    }
    if (audience === 'customer') {
      if (!account.customerProfile) {
        throw apiForbidden(
          'CUSTOMER_PROFILE_NOT_FOUND',
          'Customer profile not found',
        );
      }
      if (account.customerProfile.status === 'blocked') {
        throw apiForbidden('CUSTOMER_BLOCKED', 'Customer is blocked');
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

  private async writeLoginFailureAudit(
    email: string,
    audience: AuthAudience,
    outcome: 'failure' | 'denied',
    context: LoginRequestContext,
    reason: string,
    accountId?: string,
  ): Promise<void> {
    try {
      await this.auditWriter.write({
        actor: {
          type: 'system',
          name: 'system',
        },
        action: AUDIT_ACTIONS.authLoginFailed,
        outcome,
        resource: {
          type: 'account',
          id: accountId,
          name: email.toLowerCase(),
        },
        context,
        detail: {
          audience,
          email: email.toLowerCase(),
          reason,
        },
      });
    } catch {
      // Login failures must keep their original auth error semantics.
    }
  }

  private async writeLoginRateLimitedAudit(
    email: string,
    audience: AuthAudience,
    context: LoginRequestContext,
    reason: string,
  ): Promise<void> {
    try {
      await this.auditWriter.write({
        actor: {
          type: 'system',
          name: 'system',
        },
        action: AUDIT_ACTIONS.authLoginRateLimited,
        outcome: 'rate_limited',
        resource: {
          type: 'account',
          name: email.toLowerCase(),
        },
        context,
        detail: {
          audience,
          email: email.toLowerCase(),
          reason,
        },
      });
    } catch {
      // Login failures must keep their original auth error semantics.
    }
  }

  private resolveLoginProfileDeniedReason(error: unknown): string {
    const response =
      typeof error === 'object' && error && 'getResponse' in error
        ? (error as { getResponse: () => unknown }).getResponse()
        : undefined;
    if (typeof response === 'object' && response && 'code' in response) {
      return String((response as { code: unknown }).code);
    }
    return 'PROFILE_DENIED';
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
