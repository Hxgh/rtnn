import { BackendTestHarness } from './support/test-harness';

describe('Backend e2e', () => {
  const harness = new BackendTestHarness();

  beforeAll(async () => {
    await harness.init();
  });

  beforeEach(async () => {
    await harness.reset();
  });

  afterAll(async () => {
    await harness.close();
  });

  it('exposes healthz, readyz, and openapi without example/system routes', async () => {
    await harness.http
      .get('/healthz')
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('ok');
      });

    await harness.http
      .get('/readyz')
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('ready');
        expect(body.database).toBe('up');
      });

    await harness.http
      .get('/openapi.json')
      .expect(200)
      .expect(({ body }) => {
        expect(body.paths['/api/v1/auth/admin/login']).toBeDefined();
        expect(body.paths['/api/v1/auth/customer/me']).toBeDefined();
        expect(body.paths['/api/v1/system/me']).toBeUndefined();
        expect(body.paths['/api/v1/examples']).toBeUndefined();
      });
  });

  it('runs the minimal admin login and protected access chain', async () => {
    const loginResponse = await harness.loginAdmin().expect(200);
    const accessToken = loginResponse.body.tokens.accessToken as string;

    await harness.http
      .get('/api/v1/auth/admin/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.user.audience).toBe('admin');
        expect(body.user.email).toBe('admin@rtnn.local');
      });

    await harness.http
      .get('/api/v1/admin/audit-logs')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });

  it('runs the minimal customer login chain', async () => {
    const loginResponse = await harness.loginCustomer().expect(200);
    const accessToken = loginResponse.body.tokens.accessToken as string;

    await harness.http
      .get('/api/v1/auth/customer/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.user.audience).toBe('customer');
        expect(body.user.email).toBe('customer@rtnn.local');
      });
  });

  it('allows cors preflight from configured template consumers', async () => {
    await harness.http
      .options('/api/v1/auth/customer/login')
      .set('Origin', 'http://127.0.0.1:5103')
      .set('Access-Control-Request-Method', 'POST')
      .expect(204)
      .expect('Access-Control-Allow-Origin', 'http://127.0.0.1:5103');
  });

  it('returns 403 on protected admin route without permission', async () => {
    const loginResponse = await harness
      .loginAdmin('limited-admin@rtnn.local', 'Admin123!@#')
      .expect(200);
    const accessToken = loginResponse.body.tokens.accessToken as string;

    await harness.http
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403)
      .expect(({ body }) => {
        expect(JSON.stringify(body.error)).toContain('PERMISSION_DENIED');
      });
  });

  it('validates pagination query boundaries on protected list endpoints', async () => {
    const loginResponse = await harness.loginAdmin().expect(200);
    const accessToken = loginResponse.body.tokens.accessToken as string;

    await harness.http
      .get('/api/v1/admin/users')
      .query({ page: 0 })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400)
      .expect(({ body }) => {
        expect(JSON.stringify(body.error)).toContain('page');
      });

    await harness.http
      .get('/api/v1/admin/users')
      .query({ pageSize: 101 })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400)
      .expect(({ body }) => {
        expect(JSON.stringify(body.error)).toContain('pageSize');
      });
  });
});
