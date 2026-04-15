import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AppConfigService } from '../../core/config/app-config.service';

interface AttemptState {
  count: number;
  resetAt: number;
}

@Injectable()
export class LoginRateLimitService {
  private readonly attempts = new Map<string, AttemptState>();

  constructor(private readonly configService: AppConfigService) {}

  assertAllowed(key: string): void {
    const now = Date.now();
    const state = this.attempts.get(key);
    if (!state) {
      return;
    }
    if (state.resetAt <= now) {
      this.attempts.delete(key);
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
    const existing = this.attempts.get(key);
    if (!existing || existing.resetAt <= now) {
      this.attempts.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }
    this.attempts.set(key, { ...existing, count: existing.count + 1 });
  }

  onSuccess(key: string): void {
    this.attempts.delete(key);
  }
}
