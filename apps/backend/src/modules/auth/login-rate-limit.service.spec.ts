import { HttpException } from '@nestjs/common';
import { LoginRateLimitService } from './login-rate-limit.service';
import { InMemoryLoginRateLimitStore } from './login-rate-limit.store';

describe('LoginRateLimitService', () => {
  const configService = {
    loginRateLimitWindowSec: 300,
    loginRateLimitMaxAttempts: 2,
  };
  let store: InMemoryLoginRateLimitStore;
  let service: LoginRateLimitService;

  beforeEach(() => {
    store = new InMemoryLoginRateLimitStore();
    service = new LoginRateLimitService(configService as never, store);
  });

  it('tracks failures via the injected store and blocks after max attempts', () => {
    service.onFailure('admin:test@example.com');
    service.assertAllowed('admin:test@example.com');
    service.onFailure('admin:test@example.com');

    expect(() => service.assertAllowed('admin:test@example.com')).toThrow(
      HttpException,
    );
  });

  it('delegates reads, writes, and cleanup to the injected store', () => {
    const injectedStore = {
      get: jest.fn().mockReturnValue(undefined),
      set: jest.fn(),
      delete: jest.fn(),
    };
    const serviceWithStore = new LoginRateLimitService(
      configService as never,
      injectedStore,
    );

    serviceWithStore.assertAllowed('admin:test@example.com');
    serviceWithStore.onFailure('admin:test@example.com');
    serviceWithStore.onSuccess('admin:test@example.com');

    expect(injectedStore.get).toHaveBeenCalledWith('admin:test@example.com');
    expect(injectedStore.set).toHaveBeenCalledWith(
      'admin:test@example.com',
      expect.objectContaining({ count: 1 }),
    );
    expect(injectedStore.delete).toHaveBeenCalledWith('admin:test@example.com');
  });

  it('clears attempts after successful login', () => {
    service.onFailure('admin:test@example.com');
    service.onSuccess('admin:test@example.com');

    expect(() => service.assertAllowed('admin:test@example.com')).not.toThrow();
  });

  it('expires attempts after the configured window', () => {
    const nowSpy = jest.spyOn(Date, 'now');
    nowSpy.mockReturnValue(1_000);
    service.onFailure('admin:test@example.com');
    service.onFailure('admin:test@example.com');
    nowSpy.mockReturnValue(302_000);

    expect(() => service.assertAllowed('admin:test@example.com')).not.toThrow();

    nowSpy.mockRestore();
  });

  it('returns a stable 429 payload when rate limited', () => {
    service.onFailure('admin:test@example.com');
    service.onFailure('admin:test@example.com');

    try {
      service.assertAllowed('admin:test@example.com');
      throw new Error('Expected rate limit exception');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      const exception = error as HttpException;
      expect(exception.getStatus()).toBe(429);
      expect(exception.getResponse()).toEqual({
        code: 'LOGIN_RATE_LIMITED',
        message: 'Too many login attempts. Please retry later.',
      });
    }
  });
});
