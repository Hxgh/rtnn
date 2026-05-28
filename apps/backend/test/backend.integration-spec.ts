import { BackendTestHarness } from './support/test-harness';
import { PERMISSION_SEEDS } from '../src/common/constants/permissions.const';
import { PasswordService } from '../src/modules/auth/password.service';
import { bootstrapTemplateAccess } from '../src/support/bootstrap-template-access';

describe('Backend integration', () => {
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

  it('completes admin and customer auth chains', async () => {
    const adminLogin = await harness.loginAdmin().expect(200);
    const adminAccessToken = adminLogin.body.tokens.accessToken as string;
    const adminRefreshToken = adminLogin.body.tokens.refreshToken as string;

    await harness.http
      .get('/api/v1/auth/admin/me')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.user.roles).toContain('super-admin');
      });

    const adminRefresh = await harness.http
      .post('/api/v1/auth/admin/refresh')
      .send({ refreshToken: adminRefreshToken })
      .expect(200);

    await harness.http
      .post('/api/v1/auth/admin/logout')
      .send({ refreshToken: adminRefresh.body.tokens.refreshToken })
      .expect(200)
      .expect(({ body }) => {
        expect(body.success).toBe(true);
      });

    const customerLogin = await harness.loginCustomer().expect(200);
    const customerAccessToken = customerLogin.body.tokens.accessToken as string;

    await harness.http
      .get('/api/v1/auth/customer/me')
      .set('Authorization', `Bearer ${customerAccessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.user.roles).toContain('customer-default');
      });
  });

  it('supports IAM role creation, permission assignment, user binding, and denies unauthorized access', async () => {
    const adminLogin = await harness.loginAdmin().expect(200);
    const adminAccessToken = adminLogin.body.tokens.accessToken as string;

    const roleResponse = await harness.http
      .post('/api/v1/admin/roles')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: 'Ops Viewer',
        slug: 'ops-viewer',
      })
      .expect(201);

    await harness.http
      .patch(`/api/v1/admin/roles/${roleResponse.body.id}/permissions`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        permissionKeys: ['admin:users:view'],
      })
      .expect(200);

    const userResponse = await harness.http
      .post('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        email: 'ops-viewer@rtnn.local',
        password: 'Admin123!@#',
        name: 'Ops Viewer',
        status: 'active',
      })
      .expect(201);

    await harness.http
      .post(`/api/v1/admin/users/${userResponse.body.id}/roles`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        roleIds: [roleResponse.body.id],
      })
      .expect(201);

    const viewerLogin = await harness
      .loginAdmin('ops-viewer@rtnn.local', 'Admin123!@#')
      .expect(200);

    await harness.http
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${viewerLogin.body.tokens.accessToken}`)
      .expect(200);

    const limitedAdminLogin = await harness
      .loginAdmin('limited-admin@rtnn.local', 'Admin123!@#')
      .expect(200);

    await harness.http
      .get('/api/v1/admin/users')
      .set(
        'Authorization',
        `Bearer ${limitedAdminLogin.body.tokens.accessToken}`,
      )
      .expect(403);
  });

  it('rejects invalid IAM permission and role bindings without partial writes', async () => {
    const adminLogin = await harness.loginAdmin().expect(200);
    const adminAccessToken = adminLogin.body.tokens.accessToken as string;

    const roleResponse = await harness.http
      .post('/api/v1/admin/roles')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: 'Strict IAM Role',
        slug: 'strict-iam-role',
        permissionKeys: ['admin:users:view'],
      })
      .expect(201);

    await harness.http
      .patch(`/api/v1/admin/roles/${roleResponse.body.id}/permissions`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        permissionKeys: ['admin:users:create', 'admin:missing:permission'],
      })
      .expect(400)
      .expect(({ body }) => {
        expect(JSON.stringify(body.error)).toContain('PERMISSION_NOT_FOUND');
      });

    await harness.http
      .get(`/api/v1/admin/roles/${roleResponse.body.id}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.permissionKeys).toEqual(['admin:users:view']);
      });

    const userResponse = await harness.http
      .post('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        email: 'strict-iam-user@rtnn.local',
        password: 'Admin123!@#',
        name: 'Strict IAM User',
      })
      .expect(201);

    await harness.http
      .post(`/api/v1/admin/users/${userResponse.body.id}/roles`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        roleIds: [roleResponse.body.id, 'missing-role-id'],
      })
      .expect(400)
      .expect(({ body }) => {
        expect(JSON.stringify(body.error)).toContain('ROLE_NOT_FOUND');
      });

    await harness.http
      .get(`/api/v1/admin/users/${userResponse.body.id}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.roleIds).toEqual([]);
      });
  });

  it('expires existing admin access tokens after role permissions change', async () => {
    const adminLogin = await harness.loginAdmin().expect(200);
    const adminAccessToken = adminLogin.body.tokens.accessToken as string;

    const roleResponse = await harness.http
      .post('/api/v1/admin/roles')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: 'Revocable Viewer',
        slug: 'revocable-viewer',
        permissionKeys: ['admin:users:view'],
      })
      .expect(201);

    const userResponse = await harness.http
      .post('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        email: 'revocable-viewer@rtnn.local',
        password: 'Admin123!@#',
        name: 'Revocable Viewer',
        roleIds: [roleResponse.body.id],
      })
      .expect(201);

    const viewerLogin = await harness
      .loginAdmin('revocable-viewer@rtnn.local', 'Admin123!@#')
      .expect(200);
    const oldViewerAccessToken = viewerLogin.body.tokens.accessToken as string;

    await harness.http
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${oldViewerAccessToken}`)
      .expect(200);

    await harness.http
      .patch(`/api/v1/admin/roles/${roleResponse.body.id}/permissions`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        permissionKeys: [],
      })
      .expect(200);

    await harness.http
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${oldViewerAccessToken}`)
      .expect(401);

    const nextViewerLogin = await harness
      .loginAdmin('revocable-viewer@rtnn.local', 'Admin123!@#')
      .expect(200);

    await harness.http
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${nextViewerLogin.body.tokens.accessToken}`)
      .expect(403);

    expect(userResponse.body.roleIds).toEqual([roleResponse.body.id]);
  });

  it('tracks customer and reference-data writes in audit logs', async () => {
    const adminLogin = await harness.loginAdmin().expect(200);
    const adminAccessToken = adminLogin.body.tokens.accessToken as string;

    const groupResponse = await harness.http
      .post('/api/v1/admin/customer-groups')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: 'VIP Customers',
        slug: 'vip-customers',
      })
      .expect(201);

    const tagResponse = await harness.http
      .post('/api/v1/admin/customer-tags')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: 'Potential',
        slug: 'potential',
        color: '#60a5fa',
      })
      .expect(201);

    expect(tagResponse.body.color).toBe('#60a5fa');

    const customerResponse = await harness.http
      .post('/api/v1/admin/customers')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        email: 'new-customer@rtnn.local',
        groupIds: [groupResponse.body.id],
        name: 'New Customer',
        password: 'Customer123!@#',
        phone: '13800138000',
        tagIds: [tagResponse.body.id],
      })
      .expect(201);

    expect(customerResponse.body.groups).toEqual([
      expect.objectContaining({ id: groupResponse.body.id }),
    ]);
    expect(customerResponse.body.tags).toEqual([
      expect.objectContaining({ id: tagResponse.body.id }),
    ]);

    const updatedCustomerResponse = await harness.http
      .patch(`/api/v1/admin/customers/${customerResponse.body.id}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        groupIds: [],
        name: 'Updated Customer',
        phone: '13900139000',
        tagIds: [],
      })
      .expect(200);

    expect(updatedCustomerResponse.body.groups).toEqual([]);
    expect(updatedCustomerResponse.body.tags).toEqual([]);

    await harness.http
      .patch(`/api/v1/admin/customers/${customerResponse.body.id}/status`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        status: 'inactive',
      })
      .expect(200);

    await harness.http
      .post(
        `/api/v1/admin/customers/${customerResponse.body.id}/reset-password`,
      )
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        nextPassword: 'Customer456!@#',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.success).toBe(true);
        expect(body.temporaryPassword).toBeUndefined();
      });

    const auditResponse = await harness.http
      .get('/api/v1/admin/audit-logs')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    const actions = auditResponse.body.data.map(
      (item: { action: string }) => item.action,
    );
    expect(actions).toEqual(
      expect.arrayContaining([
        'admin.customer-group.create',
        'admin.customer-tag.create',
        'admin.customer.create',
        'admin.customer.update',
        'admin.customer.status.update',
        'admin.customer.password.reset',
      ]),
    );

    const customerCreateLog = auditResponse.body.data.find(
      (item: { action: string }) => item.action === 'admin.customer.create',
    );
    expect(customerCreateLog.actorName).toBe('Template Admin');
    expect(customerCreateLog.resourceType).toBe('customer');
    expect(customerCreateLog.resourceId).toBe(customerResponse.body.id);
    expect(groupResponse.body.name).toBe('VIP Customers');
  });

  it('maintains customer group and tag associations through create, update, and filters', async () => {
    const adminLogin = await harness.loginAdmin().expect(200);
    const adminAccessToken = adminLogin.body.tokens.accessToken as string;

    const groupAlpha = await harness.http
      .post('/api/v1/admin/customer-groups')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: 'Association Group Alpha',
        slug: 'association-group-alpha',
      })
      .expect(201);

    const groupBeta = await harness.http
      .post('/api/v1/admin/customer-groups')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: 'Association Group Beta',
        slug: 'association-group-beta',
      })
      .expect(201);

    const tagAlpha = await harness.http
      .post('/api/v1/admin/customer-tags')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: 'Association Tag Alpha',
        slug: 'association-tag-alpha',
      })
      .expect(201);

    const tagBeta = await harness.http
      .post('/api/v1/admin/customer-tags')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: 'Association Tag Beta',
        slug: 'association-tag-beta',
      })
      .expect(201);

    const customer = await harness.http
      .post('/api/v1/admin/customers')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        email: 'association-customer@rtnn.local',
        groupIds: [groupAlpha.body.id],
        name: 'Association Customer',
        password: 'Customer123!@#',
        tagIds: [tagAlpha.body.id],
      })
      .expect(201);

    expect(customer.body.groups).toEqual([
      expect.objectContaining({ id: groupAlpha.body.id }),
    ]);
    expect(customer.body.tags).toEqual([
      expect.objectContaining({ id: tagAlpha.body.id }),
    ]);

    await harness.http
      .get('/api/v1/admin/customers')
      .query({ groupId: groupAlpha.body.id })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.map((item: { id: string }) => item.id)).toContain(
          customer.body.id,
        );
      });

    await harness.http
      .get('/api/v1/admin/customers')
      .query({ tagId: tagAlpha.body.id })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.map((item: { id: string }) => item.id)).toContain(
          customer.body.id,
        );
      });

    const replaced = await harness.http
      .patch(`/api/v1/admin/customers/${customer.body.id}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        groupIds: [groupBeta.body.id],
        name: 'Association Customer Updated',
        tagIds: [tagBeta.body.id],
      })
      .expect(200);

    expect(replaced.body.groups).toEqual([
      expect.objectContaining({ id: groupBeta.body.id }),
    ]);
    expect(replaced.body.tags).toEqual([
      expect.objectContaining({ id: tagBeta.body.id }),
    ]);

    await harness.http
      .get('/api/v1/admin/customers')
      .query({ groupId: groupAlpha.body.id })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.map((item: { id: string }) => item.id)).not.toContain(
          customer.body.id,
        );
      });

    const cleared = await harness.http
      .patch(`/api/v1/admin/customers/${customer.body.id}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        groupIds: [],
        name: 'Association Customer Cleared',
        tagIds: [],
      })
      .expect(200);

    expect(cleared.body.groups).toEqual([]);
    expect(cleared.body.tags).toEqual([]);
  });

  it('keeps template access bootstrap idempotent', async () => {
    const passwordService = new PasswordService();

    await bootstrapTemplateAccess({
      prisma: harness.prismaClient,
      passwordService,
    });
    await bootstrapTemplateAccess({
      prisma: harness.prismaClient,
      passwordService,
    });

    const [tenantCount, roleCount, permissionCount, accountCount] =
      await Promise.all([
        harness.prismaClient.tenant.count(),
        harness.prismaClient.role.count(),
        harness.prismaClient.permission.count(),
        harness.prismaClient.account.count(),
      ]);

    expect(tenantCount).toBe(1);
    expect(roleCount).toBe(2);
    expect(permissionCount).toBe(PERMISSION_SEEDS.length);
    expect(accountCount).toBe(3);

    await harness.loginAdmin().expect(200);
    await harness.loginCustomer().expect(200);
  });

  it('supports admin-only template bootstrap without creating customer accounts', async () => {
    await harness.truncate();
    const passwordService = new PasswordService();

    await bootstrapTemplateAccess({
      prisma: harness.prismaClient,
      passwordService,
      adminFixture: {
        email: 'production-admin@rtnn.local',
        password: 'Admin123!@#',
        displayName: 'Production Admin',
      },
      skipCustomer: true,
    });

    const [tenantCount, roleCount, permissionCount, accountCount] =
      await Promise.all([
        harness.prismaClient.tenant.count(),
        harness.prismaClient.role.count(),
        harness.prismaClient.permission.count(),
        harness.prismaClient.account.count(),
      ]);

    expect(tenantCount).toBe(1);
    expect(roleCount).toBe(2);
    expect(permissionCount).toBe(PERMISSION_SEEDS.length);
    expect(accountCount).toBe(1);

    await harness
      .loginAdmin('production-admin@rtnn.local', 'Admin123!@#')
      .expect(200);
    await harness.loginCustomer().expect(401);
  });

  it('paginates admin list endpoints with stable meta and filters', async () => {
    const adminLogin = await harness.loginAdmin().expect(200);
    const adminAccessToken = adminLogin.body.tokens.accessToken as string;

    const roleResponseA = await harness.http
      .post('/api/v1/admin/roles')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: 'Pagination Role Alpha',
        slug: 'pagination-role-alpha',
      })
      .expect(201);

    await harness.http
      .post('/api/v1/admin/roles')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: 'Pagination Role Beta',
        slug: 'pagination-role-beta',
      })
      .expect(201);

    await harness.http
      .post('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        email: 'pagination-user-alpha@rtnn.local',
        password: 'Admin123!@#',
        name: 'Pagination User Alpha',
        roleIds: [roleResponseA.body.id],
      })
      .expect(201);

    await harness.http
      .post('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        email: 'pagination-user-beta@rtnn.local',
        password: 'Admin123!@#',
        name: 'Pagination User Beta',
      })
      .expect(201);

    await harness.http
      .post('/api/v1/admin/customer-groups')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: 'Pagination Group Alpha',
        slug: 'pagination-group-alpha',
      })
      .expect(201);

    await harness.http
      .post('/api/v1/admin/customer-groups')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: 'Pagination Group Beta',
        slug: 'pagination-group-beta',
      })
      .expect(201);

    await harness.http
      .post('/api/v1/admin/customer-tags')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: 'Pagination Tag Alpha',
        slug: 'pagination-tag-alpha',
      })
      .expect(201);

    await harness.http
      .post('/api/v1/admin/customer-tags')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: 'Pagination Tag Beta',
        slug: 'pagination-tag-beta',
      })
      .expect(201);

    await harness.http
      .post('/api/v1/admin/customers')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        email: 'pagination-customer-alpha@rtnn.local',
        name: 'Pagination Customer Alpha',
        password: 'Customer123!@#',
      })
      .expect(201);

    await harness.http
      .post('/api/v1/admin/customers')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        email: 'pagination-customer-beta@rtnn.local',
        name: 'Pagination Customer Beta',
        password: 'Customer123!@#',
      })
      .expect(201);

    const usersPageOne = await harness.http
      .get('/api/v1/admin/users')
      .query({
        search: 'pagination-user',
        page: 1,
        pageSize: 1,
      })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    const usersPageTwo = await harness.http
      .get('/api/v1/admin/users')
      .query({
        search: 'pagination-user',
        page: 2,
        pageSize: 1,
      })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(usersPageOne.body.meta).toMatchObject({
      page: 1,
      pageSize: 1,
      total: 2,
      totalPages: 2,
    });
    expect(usersPageOne.body.data).toHaveLength(1);
    expect(usersPageTwo.body.meta).toMatchObject({
      page: 2,
      pageSize: 1,
      total: 2,
      totalPages: 2,
    });
    expect(usersPageTwo.body.data).toHaveLength(1);

    const rolesPageTwo = await harness.http
      .get('/api/v1/admin/roles')
      .query({
        search: 'Pagination Role',
        page: 2,
        pageSize: 1,
      })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(rolesPageTwo.body.meta).toMatchObject({
      page: 2,
      pageSize: 1,
      total: 2,
      totalPages: 2,
    });
    expect(rolesPageTwo.body.data).toHaveLength(1);

    const groupsPageTwo = await harness.http
      .get('/api/v1/admin/customer-groups')
      .query({
        search: 'Pagination Group',
        page: 2,
        pageSize: 1,
      })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(groupsPageTwo.body.meta).toMatchObject({
      page: 2,
      pageSize: 1,
      total: 2,
      totalPages: 2,
    });
    expect(groupsPageTwo.body.data).toHaveLength(1);

    const tagsPageTwo = await harness.http
      .get('/api/v1/admin/customer-tags')
      .query({
        search: 'Pagination Tag',
        page: 2,
        pageSize: 1,
      })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(tagsPageTwo.body.meta).toMatchObject({
      page: 2,
      pageSize: 1,
      total: 2,
      totalPages: 2,
    });
    expect(tagsPageTwo.body.data).toHaveLength(1);

    const customersPageTwo = await harness.http
      .get('/api/v1/admin/customers')
      .query({
        search: 'pagination-customer',
        page: 2,
        pageSize: 1,
      })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(customersPageTwo.body.meta).toMatchObject({
      page: 2,
      pageSize: 1,
      total: 2,
      totalPages: 2,
    });
    expect(customersPageTwo.body.data).toHaveLength(1);

    const auditLogsPageTwo = await harness.http
      .get('/api/v1/admin/audit-logs')
      .query({
        action: 'admin.customer.create',
        page: 2,
        pageSize: 1,
      })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(auditLogsPageTwo.body.meta).toMatchObject({
      page: 2,
      pageSize: 1,
      total: 2,
      totalPages: 2,
    });
    expect(auditLogsPageTwo.body.data).toHaveLength(1);
    expect(
      auditLogsPageTwo.body.data.every(
        (item: { action: string }) => item.action === 'admin.customer.create',
      ),
    ).toBe(true);
  });

  it('returns locale-aware error responses with Content-Language', async () => {
    await harness.http
      .get('/api/v1/admin/users')
      .set('Accept-Language', 'zh-CN')
      .expect('Content-Language', 'zh-CN')
      .expect(401)
      .expect(({ body }) => {
        expect(JSON.stringify(body.error)).toContain('缺少 Bearer 令牌');
      });
  });
});
