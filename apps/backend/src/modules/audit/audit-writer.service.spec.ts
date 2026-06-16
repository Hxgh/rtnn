import { AuditWriter } from './audit-writer.service';

describe('AuditWriter', () => {
  it('writes actor, resource, and detail without guessing the target as actor', async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const writer = new AuditWriter({
      auditLog: {
        create,
      },
    } as never);

    await writer.write({
      actor: {
        type: 'admin',
        accountId: 'acc_admin',
        name: 'Template Admin',
      },
      action: 'admin.customer.create',
      resource: {
        type: 'customer',
        id: 'cus_01',
      },
      detail: {
        email: 'customer@rtnn.local',
      },
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        tenantId: undefined,
        actorAccountId: 'acc_admin',
        actorAudience: 'admin',
        actorName: 'Template Admin',
        action: 'admin.customer.create',
        category: 'customers',
        outcome: 'success',
        resource: 'customer',
        resourceId: 'cus_01',
        resourceName: undefined,
        requestId: undefined,
        ipHash: undefined,
        userAgent: undefined,
        schemaVersion: 1,
        detail: {
          email: 'customer@rtnn.local',
        },
      },
    });
  });

  it('rejects unregistered audit actions', async () => {
    const writer = new AuditWriter({
      auditLog: {
        create: jest.fn(),
      },
    } as never);

    await expect(
      writer.write({
        actor: {
          type: 'system',
        },
        action: 'admin.unknown.action' as never,
        resource: {
          type: 'customer',
          id: 'cus_01',
        },
      }),
    ).rejects.toThrow('Unregistered audit action');
  });

  it('sanitizes sensitive detail and writes request context', async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const writer = new AuditWriter({
      auditLog: {
        create,
      },
    } as never);

    await writer.write({
      actor: {
        type: 'system',
        name: 'system',
      },
      action: 'auth.login.failed',
      outcome: 'failure',
      resource: {
        type: 'account',
        id: 'acc_01',
        name: 'admin@rtnn.local',
      },
      context: {
        requestId: 'req_01',
        ip: '127.0.0.1',
        userAgent: `Mozilla/${'x'.repeat(600)}`,
      },
      detail: {
        email: 'admin@rtnn.local',
        passwordChanged: false,
        password: 'secret-password',
        nested: {
          refreshToken: 'token-value',
          connectionString: 'postgres://secret',
        },
      },
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'auth.login.failed',
        category: 'auth',
        outcome: 'failure',
        resource: 'account',
        resourceId: 'acc_01',
        resourceName: 'admin@rtnn.local',
        requestId: 'req_01',
        ipHash: expect.stringMatching(/^[a-f0-9]{32}$/),
        userAgent: expect.stringMatching(/^Mozilla\//),
        schemaVersion: 1,
        detail: {
          email: 'admin@rtnn.local',
          passwordChanged: false,
          password: true,
          nested: {
            refreshToken: '[redacted]',
            connectionString: '[redacted]',
          },
        },
      }),
    });
    expect(create.mock.calls[0][0].data.userAgent).toHaveLength(512);
  });
});
