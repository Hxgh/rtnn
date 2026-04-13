import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppEnv, NodeEnv } from './env.validation';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService<AppEnv, true>) {}

  get nodeEnv(): NodeEnv {
    return this.configService.get('NODE_ENV', { infer: true });
  }

  get port(): number {
    return this.configService.get('PORT', { infer: true });
  }

  get databaseUrl(): string {
    return this.configService.get('DATABASE_URL', { infer: true });
  }

  get loginRateLimitWindowSec(): number {
    return this.configService.get('LOGIN_RATE_LIMIT_WINDOW_SEC', {
      infer: true,
    });
  }

  get loginRateLimitMaxAttempts(): number {
    return this.configService.get('LOGIN_RATE_LIMIT_MAX_ATTEMPTS', {
      infer: true,
    });
  }

  get jwtIssuer(): string {
    return this.configService.get('JWT_ISSUER', { infer: true });
  }

  get jwtAudience(): string {
    return this.configService.get('JWT_AUDIENCE', { infer: true });
  }

  get jwtAccessSecret(): string {
    return this.configService.get('JWT_ACCESS_SECRET', { infer: true });
  }

  get jwtRefreshSecret(): string {
    return this.configService.get('JWT_REFRESH_SECRET', { infer: true });
  }

  get jwtAccessExpiresIn(): string {
    return this.configService.get('JWT_ACCESS_EXPIRES_IN', { infer: true });
  }

  get jwtRefreshExpiresIn(): string {
    return this.configService.get('JWT_REFRESH_EXPIRES_IN', { infer: true });
  }
}
