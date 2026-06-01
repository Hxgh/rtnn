import { Inject, Injectable } from '@nestjs/common';
import { AppConfigService } from '../../core/config/app-config.service';
import { LOGIN_RATE_LIMIT_STORE } from './login-rate-limit.store';
import * as loginRateLimitStore from './login-rate-limit.store';
import { apiTooManyRequests } from '../../common/errors/api-error';

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
      throw apiTooManyRequests(
        'LOGIN_RATE_LIMITED',
        'Too many login attempts. Please retry later.',
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
