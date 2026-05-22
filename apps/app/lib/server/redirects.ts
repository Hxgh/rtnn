const SAFE_REDIRECT_ORIGIN = "http://rtnn.local";

export function normalizeSafeRedirectPath(
  value: string | null | undefined,
  fallback = "/home",
) {
  const path = String(value ?? "").trim();
  if (
    !path ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\")
  ) {
    return fallback;
  }

  try {
    const url = new URL(path, SAFE_REDIRECT_ORIGIN);
    if (url.origin !== SAFE_REDIRECT_ORIGIN) {
      return fallback;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
