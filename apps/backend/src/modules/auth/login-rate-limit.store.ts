import { Injectable } from '@nestjs/common';

export interface LoginRateLimitState {
  count: number;
  resetAt: number;
}

export const LOGIN_RATE_LIMIT_STORE = Symbol('LOGIN_RATE_LIMIT_STORE');

export interface LoginRateLimitStore {
  get(key: string): LoginRateLimitState | undefined;
  set(key: string, state: LoginRateLimitState): void;
  delete(key: string): void;
}

@Injectable()
export class InMemoryLoginRateLimitStore implements LoginRateLimitStore {
  private readonly attempts = new Map<string, LoginRateLimitState>();

  get(key: string): LoginRateLimitState | undefined {
    return this.attempts.get(key);
  }

  set(key: string, state: LoginRateLimitState): void {
    this.attempts.set(key, state);
  }

  delete(key: string): void {
    this.attempts.delete(key);
  }
}
