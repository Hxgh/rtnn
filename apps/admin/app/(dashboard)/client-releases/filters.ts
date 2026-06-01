import { adminRoutes } from "@/src/lib/admin-routes";
import type { PageSearchParams } from "./types";

export const defaultPageSize = 20;
export const clients = ["adminDesktop", "appMobile"] as const;
export const targets = ["android", "ios", "macos", "windows"] as const;

export function normalizeFilters(params?: Awaited<PageSearchParams>) {
  return {
    search: String(params?.search ?? "").trim(),
    channel: String(params?.channel ?? "").trim(),
    client: String(params?.client ?? "").trim(),
    target: String(params?.target ?? "").trim(),
    distributionStatus: String(params?.distributionStatus ?? "").trim(),
  };
}

export type ClientReleaseFilters = ReturnType<typeof normalizeFilters>;

export function buildHref(
  page: number,
  pageSize: number,
  filters: ClientReleaseFilters,
) {
  return buildClientReleaseHref(
    adminRoutes.clientReleases.list,
    page,
    pageSize,
    filters,
  );
}

export function buildPackagesHref(
  page: number,
  pageSize: number,
  filters: ClientReleaseFilters,
) {
  return buildClientReleaseHref(
    adminRoutes.clientReleases.packages,
    page,
    pageSize,
    filters,
  );
}

function buildClientReleaseHref(
  pathname: string,
  page: number,
  pageSize: number,
  filters: ClientReleaseFilters,
) {
  const params = new URLSearchParams();
  if (page > 1) {
    params.set("page", String(page));
  }
  if (pageSize !== defaultPageSize) {
    params.set("pageSize", String(pageSize));
  }
  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      params.set(key, value);
    }
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
