import type { JsonRecord } from './client-releases.types';

export function normalizeNullableString(value: unknown) {
  const normalized = stringValue(value);
  return normalized || null;
}

export function stringValue(value: unknown, fallback = '') {
  if (value === undefined || value === null) {
    return fallback;
  }
  if (
    typeof value !== 'string' &&
    typeof value !== 'number' &&
    typeof value !== 'boolean' &&
    typeof value !== 'bigint'
  ) {
    return fallback;
  }
  const normalized = String(value).trim();
  return normalized || fallback;
}

export function numberValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : undefined;
}

export function dateValue(value: unknown): Date | undefined {
  const normalized = stringValue(value);
  if (!normalized) {
    return undefined;
  }
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => stringValue(item)).filter(Boolean);
}

export function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort();
}

export function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

export function policyKey(policy: {
  client: string;
  target: string;
  channel: string;
}) {
  return `${policy.client}\u0000${policy.target}\u0000${policy.channel}`;
}

export function parseSemver(value: string): [number, number, number] | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(value.trim());
  if (!match) {
    return null;
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}
