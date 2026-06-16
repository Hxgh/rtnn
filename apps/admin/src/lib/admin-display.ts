import {
  AUDIT_ACTION_DEFINITIONS,
  AUDIT_CATEGORIES,
  AUDIT_OUTCOMES,
  AUDIT_RESOURCE_TYPES,
  PERMISSION_DEFINITIONS,
  type AuditCategory,
  type AuditAction,
  type AuditOutcome,
  type AuditResourceType,
  type PermissionKey,
} from "@rtnn/shared-types";

const permissionLabelByKey = new Map(
  PERMISSION_DEFINITIONS.map((permission) => [permission.key, permission.name]),
);
const auditActionDefinitionByAction = new Map(
  AUDIT_ACTION_DEFINITIONS.map((definition) => [definition.action, definition]),
);
export type AuditLabelDictionary = {
  actions: Record<string, string>;
  categories: Record<string, string>;
  outcomes: Record<string, string>;
  resourceTypes: Record<string, string>;
};

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

export function formatAuditActionLabel(
  action: string,
  labels: AuditLabelDictionary,
) {
  const definition = auditActionDefinitionByAction.get(action as never);
  if (!definition) {
    return action;
  }
  return labels.actions[definition.labelKey] ?? action;
}

export function formatAuditResourceLabel(
  resourceType: string,
  labels: AuditLabelDictionary,
) {
  return labels.resourceTypes[resourceType] ?? resourceType;
}

export function formatAuditCategoryLabel(
  category: string,
  labels: AuditLabelDictionary,
) {
  return labels.categories[category] ?? category;
}

export function formatAuditOutcomeLabel(
  outcome: string,
  labels: AuditLabelDictionary,
) {
  return labels.outcomes[outcome] ?? outcome;
}

export function getAuditOutcomeTone(
  outcome: string,
): "success" | "warning" | "danger" | "neutral" {
  switch (outcome) {
    case "success":
      return "success";
    case "failure":
      return "danger";
    case "denied":
    case "rate_limited":
      return "warning";
    default:
      return "neutral";
  }
}

export function getAuditCategoryOptions(labels: AuditLabelDictionary) {
  return AUDIT_CATEGORIES.map((category) => ({
    label: formatAuditCategoryLabel(category, labels),
    value: category satisfies AuditCategory,
  }));
}

export function getAuditActionOptions(labels: AuditLabelDictionary) {
  return AUDIT_ACTION_DEFINITIONS.map((definition) => ({
    label: formatAuditActionLabel(definition.action, labels),
    value: definition.action satisfies AuditAction,
  }));
}

export function getAuditOutcomeOptions(labels: AuditLabelDictionary) {
  return AUDIT_OUTCOMES.map((outcome) => ({
    label: formatAuditOutcomeLabel(outcome, labels),
    value: outcome satisfies AuditOutcome,
  }));
}

export function getAuditResourceTypeOptions(labels: AuditLabelDictionary) {
  return AUDIT_RESOURCE_TYPES.map((resourceType) => ({
    label: formatAuditResourceLabel(resourceType, labels),
    value: resourceType satisfies AuditResourceType,
  }));
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
