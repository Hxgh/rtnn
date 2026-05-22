import { PERMISSION_DEFINITIONS, type PermissionKey } from "@rtnn/shared-types";

const permissionLabelByKey = new Map(
  PERMISSION_DEFINITIONS.map((permission) => [permission.key, permission.name]),
);

export function formatAdminPermissionLabel(key: string) {
  return permissionLabelByKey.get(key as PermissionKey) ?? key;
}

export function formatClientReleaseChannel(channel: string, locale?: string) {
  const isEnglish = locale?.startsWith("en");
  switch (channel) {
    case "testing":
      return isEnglish ? "Pre-release" : "预发布";
    case "production":
      return isEnglish ? "Production" : "生产";
    default:
      return channel;
  }
}

export function formatAuditActionLabel(action: string, locale?: string) {
  const isEnglish = locale?.startsWith("en");
  switch (action) {
    case "admin.customer.create":
      return isEnglish ? "Create customer" : "新建客户";
    case "admin.customer.update":
      return isEnglish ? "Update customer" : "更新客户";
    case "admin.customer.status.update":
      return isEnglish ? "Update customer status" : "更新客户状态";
    case "admin.customer.password.reset":
      return isEnglish ? "Reset customer password" : "重置客户密码";
    case "admin.customer-group.create":
      return isEnglish ? "Create customer group" : "新建客户分组";
    case "admin.customer-group.update":
      return isEnglish ? "Update customer group" : "更新客户分组";
    case "admin.customer-tag.create":
      return isEnglish ? "Create customer tag" : "新建客户标签";
    case "admin.customer-tag.update":
      return isEnglish ? "Update customer tag" : "更新客户标签";
    case "admin.role.create":
      return isEnglish ? "Create role" : "新建角色";
    case "admin.role.update":
      return isEnglish ? "Update role" : "更新角色";
    case "admin.role.permissions.update":
      return isEnglish ? "Update role permissions" : "更新角色权限";
    case "admin.user.create":
      return isEnglish ? "Create admin user" : "新建管理员";
    case "admin.user.update":
      return isEnglish ? "Update admin user" : "更新管理员";
    default:
      return action;
  }
}

export function formatAuditResourceLabel(resourceType: string, locale?: string) {
  const isEnglish = locale?.startsWith("en");
  switch (resourceType) {
    case "customer":
      return isEnglish ? "Customer" : "客户";
    case "customer-group":
      return isEnglish ? "Customer group" : "客户分组";
    case "customer-tag":
      return isEnglish ? "Customer tag" : "客户标签";
    case "role":
      return isEnglish ? "Role" : "角色";
    case "user":
      return isEnglish ? "Admin user" : "管理员";
    default:
      return resourceType;
  }
}

export function formatAuditDetailSummary(
  detail: unknown,
  locale?: string,
): string | null {
  if (!detail) {
    return null;
  }

  const isEnglish = locale?.startsWith("en");
  const emptyText = isEnglish ? "No detail" : "无详情";

  if (typeof detail !== "object" || Array.isArray(detail)) {
    const text = String(detail).trim();
    return text || null;
  }

  const entries = Object.entries(detail as Record<string, unknown>).filter(
    ([, value]) => value !== undefined && value !== null && value !== "",
  );
  if (entries.length === 0) {
    return null;
  }

  const summary = entries
    .slice(0, 3)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}: ${value.join(", ") || emptyText}`;
      }
      if (typeof value === "object" && value !== null) {
        return `${key}: ${JSON.stringify(value)}`;
      }
      return `${key}: ${String(value)}`;
    })
    .join(" · ");

  return summary || null;
}
