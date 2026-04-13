import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  it('should parse and normalize env config', () => {
    const parsed = validateEnv({
      NODE_ENV: 'development',
      PORT: '5100',
      DATABASE_URL:
        'postgresql://postgres:postgres@localhost:5432/rtnn?schema=public',
      LOGIN_RATE_LIMIT_WINDOW_SEC: '300',
      LOGIN_RATE_LIMIT_MAX_ATTEMPTS: '10',
      JWT_ISSUER: 'rtnn-backend',
      JWT_AUDIENCE: 'rtnn-clients',
      JWT_ACCESS_SECRET: 'abcdefghijklmnopqrstuvwxyz',
      JWT_REFRESH_SECRET: 'abcdefghijklmnopqrstuvwxyz012345',
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
    });
    expect(parsed.PORT).toBe(5100);
    expect(parsed.LOGIN_RATE_LIMIT_WINDOW_SEC).toBe(300);
    expect(parsed.LOGIN_RATE_LIMIT_MAX_ATTEMPTS).toBe(10);
    expect(parsed.NODE_ENV).toBe('development');
  });

  it('should throw on invalid env config', () => {
    expect(() =>
      validateEnv({
        PORT: 'not-a-port',
      }),
    ).toThrow();
  });
});
