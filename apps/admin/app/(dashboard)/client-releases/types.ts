import type { getAdminI18n } from "@/src/i18n/server";
import type {
  listClientDownloads,
  listClientReleases,
} from "@/src/lib/api-client";

export type ClientReleasesDictionary = Awaited<
  ReturnType<typeof getAdminI18n>
>["dictionary"];
export type ClientReleaseRow = Awaited<
  ReturnType<typeof listClientReleases>
>["data"][number];
export type ClientDownloadRow = Awaited<
  ReturnType<typeof listClientDownloads>
>[number];
export type DiagnosticTone = "success" | "warning" | "danger" | "neutral";

export type PageSearchParams = Promise<{
  page?: string;
  pageSize?: string;
  search?: string;
  channel?: string;
  client?: string;
  target?: string;
  distributionStatus?: string;
}>;
