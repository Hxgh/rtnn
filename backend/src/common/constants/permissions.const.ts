export type PermissionGroup =
  | 'admin'
  | 'dashboard'
  | 'iam'
  | 'customers'
  | 'customer-groups'
  | 'customer-tags'
  | 'audit'
  | 'customer-self';

export interface PermissionRegistryEntry {
  key: string;
  name: string;
  description: string;
  group: PermissionGroup;
}

function definePermissionRegistry<T extends Record<string, PermissionRegistryEntry>>(
  registry: T,
): T {
  return registry;
}

type PermissionMap<T extends Record<string, PermissionRegistryEntry>> = {
  [K in keyof T]: T[K]['key'];
};

function toPermissionMap<T extends Record<string, PermissionRegistryEntry>>(
  registry: T,
): PermissionMap<T> {
  return Object.fromEntries(
    Object.entries(registry).map(([code, definition]) => [code, definition.key]),
  ) as PermissionMap<T>;
}

export const PERMISSION_REGISTRY = definePermissionRegistry({
  adminAccess: {
    key: 'admin:access',
    name: 'Admin Access',
    description: 'Access the admin application shell.',
    group: 'admin',
  },
  adminDashboardView: {
    key: 'admin:dashboard:view',
    name: 'View Dashboard',
    description: 'View the admin dashboard summary.',
    group: 'dashboard',
  },
  adminUsersView: {
    key: 'admin:users:view',
    name: 'View Users',
    description: 'View admin user records.',
    group: 'iam',
  },
  adminUsersCreate: {
    key: 'admin:users:create',
    name: 'Create Users',
    description: 'Create new admin users.',
    group: 'iam',
  },
  adminUsersUpdate: {
    key: 'admin:users:update',
    name: 'Update Users',
    description: 'Update admin users.',
    group: 'iam',
  },
  adminUsersAssignRoles: {
    key: 'admin:users:assign-roles',
    name: 'Assign User Roles',
    description: 'Assign roles to admin users.',
    group: 'iam',
  },
  adminRolesView: {
    key: 'admin:roles:view',
    name: 'View Roles',
    description: 'View role records.',
    group: 'iam',
  },
  adminRolesCreate: {
    key: 'admin:roles:create',
    name: 'Create Roles',
    description: 'Create new roles.',
    group: 'iam',
  },
  adminRolesUpdate: {
    key: 'admin:roles:update',
    name: 'Update Roles',
    description: 'Update role definitions.',
    group: 'iam',
  },
  adminPermissionsView: {
    key: 'admin:permissions:view',
    name: 'View Permissions',
    description: 'View the permission registry.',
    group: 'iam',
  },
  adminCustomersView: {
    key: 'admin:customers:view',
    name: 'View Customers',
    description: 'View customer records.',
    group: 'customers',
  },
  adminCustomersCreate: {
    key: 'admin:customers:create',
    name: 'Create Customers',
    description: 'Create customer records.',
    group: 'customers',
  },
  adminCustomersUpdate: {
    key: 'admin:customers:update',
    name: 'Update Customers',
    description: 'Update customer records.',
    group: 'customers',
  },
  adminCustomersSuspend: {
    key: 'admin:customers:suspend',
    name: 'Suspend Customers',
    description: 'Suspend customer access.',
    group: 'customers',
  },
  adminCustomerGroupsView: {
    key: 'admin:customer-groups:view',
    name: 'View Customer Groups',
    description: 'View customer groups.',
    group: 'customer-groups',
  },
  adminCustomerGroupsManage: {
    key: 'admin:customer-groups:manage',
    name: 'Manage Customer Groups',
    description: 'Create and update customer groups.',
    group: 'customer-groups',
  },
  adminCustomerTagsView: {
    key: 'admin:customer-tags:view',
    name: 'View Customer Tags',
    description: 'View customer tags.',
    group: 'customer-tags',
  },
  adminCustomerTagsManage: {
    key: 'admin:customer-tags:manage',
    name: 'Manage Customer Tags',
    description: 'Create and update customer tags.',
    group: 'customer-tags',
  },
  adminAuditLogsView: {
    key: 'admin:audit-logs:view',
    name: 'View Audit Logs',
    description: 'View audit log records.',
    group: 'audit',
  },
  customerSelfView: {
    key: 'customer:self:view',
    name: 'View Customer Profile',
    description: 'View the current customer profile.',
    group: 'customer-self',
  },
  customerSelfUpdate: {
    key: 'customer:self:update',
    name: 'Update Customer Profile',
    description: 'Update the current customer profile.',
    group: 'customer-self',
  },
} as const);

export const PERMISSIONS = toPermissionMap(PERMISSION_REGISTRY);

export const DEFAULT_PERMISSION_SET = Object.values(
  PERMISSIONS,
) as PermissionValue[];

export const PERMISSION_SEEDS = Object.values(PERMISSION_REGISTRY).map(
  ({ key, name, description }) => ({
    key,
    name,
    description,
  }),
);

export type PermissionCode = keyof typeof PERMISSION_REGISTRY;
export type PermissionValue = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
export type PermissionDefinition =
  (typeof PERMISSION_REGISTRY)[keyof typeof PERMISSION_REGISTRY];
