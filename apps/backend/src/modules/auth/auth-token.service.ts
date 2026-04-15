import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthAudience } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import { AppConfigService } from '../../core/config/app-config.service';
import { AccessTokenPayload, RefreshTokenPayload } from './auth.types';

@Injectable()
export class AuthTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly appConfigService: AppConfigService,
  ) {}

  createAccessToken(payload: Omit<AccessTokenPayload, 'type'>): string {
    return this.jwtService.sign(
      { ...payload, type: 'access' },
      {
        secret: this.appConfigService.jwtAccessSecret,
        expiresIn: this.resolveDurationToSeconds(
          this.appConfigService.jwtAccessExpiresIn,
        ),
        issuer: this.appConfigService.jwtIssuer,
        audience: this.appConfigService.jwtAudience,
      },
    );
  }

  createRefreshToken(payload: Omit<RefreshTokenPayload, 'type' | 'rid'>): {
    token: string;
    rid: string;
  } {
    const rid = randomUUID();
    const token = this.jwtService.sign(
      { ...payload, rid, type: 'refresh' },
      {
        secret: this.appConfigService.jwtRefreshSecret,
        expiresIn: this.resolveDurationToSeconds(
          this.appConfigService.jwtRefreshExpiresIn,
        ),
        issuer: this.appConfigService.jwtIssuer,
        audience: this.appConfigService.jwtAudience,
      },
    );
    return { token, rid };
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      const payload = this.jwtService.verify<AccessTokenPayload>(token, {
        secret: this.appConfigService.jwtAccessSecret,
        issuer: this.appConfigService.jwtIssuer,
        audience: this.appConfigService.jwtAudience,
      });
      if (payload.type !== 'access') {
        throw new UnauthorizedException('Invalid access token type');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      const payload = this.jwtService.verify<RefreshTokenPayload>(token, {
        secret: this.appConfigService.jwtRefreshSecret,
        issuer: this.appConfigService.jwtIssuer,
        audience: this.appConfigService.jwtAudience,
      });
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token type');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  normalizeAudience(raw: string): AuthAudience {
    if (raw === 'admin' || raw === 'customer') {
      return raw;
    }
    throw new UnauthorizedException('Invalid audience');
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
