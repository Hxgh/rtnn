import { DEFAULT_PERMISSION_KEYS, type PermissionKey } from "@rtnn/shared-types";
import { z } from "zod";

const permissionKeyValues = [...DEFAULT_PERMISSION_KEYS] as [
  PermissionKey,
  ...PermissionKey[],
];

export const authAudienceSchema = z.enum(["admin", "customer"]);
export const accountStatusSchema = z.enum(["active", "disabled", "locked"]);
export const customerStatusSchema = z.enum(["active", "inactive", "blocked"]);
export const userRoleSchema = z.enum([
  "SUPER_ADMIN",
  "OPS_ADMIN",
  "CONTENT_EDITOR",
  "CUSTOMER_MANAGER",
  "VIEWER",
]);
export const permissionKeySchema = z.enum(permissionKeyValues);
export const auditActorTypeSchema = z.enum(["admin", "customer", "system"]);

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(20).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(128),
  nextPassword: z.string().min(8).max(128),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminUserListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).max(120).optional(),
});

const createAdminUserSchemaBase = z.object({
  email: z.string().email(),
  displayName: z.string().trim().min(1).max(80).optional(),
  name: z.string().trim().min(1).max(80).optional(),
  password: z.string().min(8).max(128),
  roleIds: z.array(z.string().min(1)).min(1).optional(),
  status: accountStatusSchema.default("active"),
  tenantId: z.string().trim().min(1).optional(),
});

export const createAdminUserSchema = createAdminUserSchemaBase.refine(
  (value) => Boolean(value.displayName || value.name),
  {
    message: "displayName or name is required",
  },
);

export const updateAdminUserSchema = createAdminUserSchemaBase.partial().extend({
  roleIds: z.array(z.string().min(1)).min(1).optional(),
});

export const createRoleSchema = z.object({
  code: userRoleSchema.or(z.string().min(1)).optional(),
  slug: z.string().trim().min(1).max(80).optional(),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(240).optional(),
  permissionKeys: z.array(permissionKeySchema).min(1).optional(),
});

export const updateRoleSchema = createRoleSchema.partial();

const createCustomerSchemaBase = z.object({
  email: z.string().email(),
  name: z.string().trim().min(1).max(80).optional(),
  password: z.string().min(8).max(128),
  phone: z.string().trim().max(40).optional(),
  tenantId: z.string().trim().min(1).optional(),
  groupIds: z.array(z.string().trim().min(1)).optional(),
  tagIds: z.array(z.string().trim().min(1)).optional(),
});

export const customerListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).max(120).optional(),
  status: customerStatusSchema.optional(),
  groupId: z.string().trim().min(1).optional(),
  tagId: z.string().trim().min(1).optional(),
});

export const createCustomerSchema = createCustomerSchemaBase.refine(
  (value) => Boolean(value.name),
  {
    message: "name is required",
  },
);

export const updateCustomerSchema = createCustomerSchemaBase
  .omit({ email: true })
  .partial()
  .extend({
    password: z.string().min(8).max(128).optional(),
  });

export const resetCustomerPasswordSchema = z.object({
  nextPassword: z.string().min(8).max(128),
});

export const createCustomerGroupSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(240).optional(),
});

export const updateCustomerGroupSchema = createCustomerGroupSchema.partial();

export const createCustomerTagSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z.string().trim().min(1).max(80).optional(),
  color: z.string().trim().max(32).optional(),
  description: z.string().trim().max(240).optional(),
});

export const updateCustomerTagSchema = createCustomerTagSchema.partial().extend({
  color: z.string().trim().max(32).nullable().optional(),
});

export const auditLogListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).max(120).optional(),
  actorType: auditActorTypeSchema.optional(),
  action: z.string().trim().min(1).max(80).optional(),
});
