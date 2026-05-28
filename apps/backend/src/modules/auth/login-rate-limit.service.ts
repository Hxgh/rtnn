import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppConfigService } from '../../core/config/app-config.service';
import { LOGIN_RATE_LIMIT_STORE } from './login-rate-limit.store';
import * as loginRateLimitStore from './login-rate-limit.store';

@Injectable()
export class LoginRateLimitService {
  constructor(
    private readonly configService: AppConfigService,
    @Inject(LOGIN_RATE_LIMIT_STORE)
    private readonly store: loginRateLimitStore.LoginRateLimitStore,
  ) {}

  assertAllowed(key: string): void {
    const now = Date.now();
    const state = this.store.get(key);
    if (!state) {
      return;
    }
    if (state.resetAt <= now) {
      this.store.delete(key);
      return;
    }
    if (state.count >= this.configService.loginRateLimitMaxAttempts) {
      throw new HttpException(
        {
          code: 'LOGIN_RATE_LIMITED',
          message: 'Too many login attempts. Please retry later.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  onFailure(key: string): void {
    const now = Date.now();
    const windowMs = this.configService.loginRateLimitWindowSec * 1000;
    const existing = this.store.get(key);
    if (!existing || existing.resetAt <= now) {
      this.store.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }
    this.store.set(key, { ...existing, count: existing.count + 1 });
  }

  onSuccess(key: string): void {
    this.store.delete(key);
  }
}
