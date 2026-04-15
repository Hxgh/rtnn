type ClassValue =
  | string
  | number
  | null
  | undefined
  | false
  | ClassValue[]
  | Record<string, boolean | undefined>;

export function cn(...values: ClassValue[]): string {
  const output: string[] = [];

  for (const value of values) {
    if (!value) {
      continue;
    }

    if (typeof value === "string" || typeof value === "number") {
      output.push(String(value));
      continue;
    }

    if (Array.isArray(value)) {
      const nested = cn(...value);
      if (nested) {
        output.push(nested);
      }
      continue;
    }

    for (const [key, enabled] of Object.entries(value)) {
      if (enabled) {
        output.push(key);
      }
    }
  }

  return output.join(" ");
}

export function parsePositiveInt(
  value: string | string[] | undefined,
  fallback = 1,
): number {
  const normalized = Array.isArray(value) ? value[0] : value;
  const parsed = Number(normalized);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}
