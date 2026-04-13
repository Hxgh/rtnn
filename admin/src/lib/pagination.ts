import { parsePositiveInt } from "@/src/lib/utils";

export const ADMIN_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export function parsePageSize(
  value: string | string[] | undefined,
  fallback = 20,
): number {
  const parsed = parsePositiveInt(value, fallback);

  if (parsed > 100) {
    return 100;
  }

  return parsed;
}

export function resolvePageSizeOptions(pageSize: number): number[] {
  return Array.from(new Set([...ADMIN_PAGE_SIZE_OPTIONS, pageSize]))
    .filter((value) => value >= 1 && value <= 100)
    .sort((left, right) => left - right);
}
