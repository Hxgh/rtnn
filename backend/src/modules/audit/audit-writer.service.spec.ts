import { AuditWriter } from "./audit-writer.service";

describe("AuditWriter", () => {
  it("writes actor, resource, and detail without guessing the target as actor", async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const writer = new AuditWriter({
      auditLog: {
        create,
      },
    } as never);

    await writer.write({
      actor: {
        type: "admin",
        accountId: "acc_admin",
        name: "Template Admin",
      },
      action: "admin.customer.create",
      resource: {
        type: "customer",
        id: "cus_01",
      },
      detail: {
        email: "customer@rtnn.local",
      },
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        tenantId: undefined,
        actorAccountId: "acc_admin",
        actorAudience: "admin",
        actorName: "Template Admin",
        action: "admin.customer.create",
        resource: "customer",
        resourceId: "cus_01",
        detail: {
          email: "customer@rtnn.local",
        },
      },
    });
  });
});
