import type { AdminStatusTone } from "@/src/components/admin/table-display";
import { formatClientReleaseChannel } from "@/src/lib/admin-display";

export const clientReleaseDistributionStatuses = [
  "pending",
  "synced",
  "failed",
  "pruned",
  "disabled",
] as const;

export type ClientReleaseDistributionStatus =
  (typeof clientReleaseDistributionStatuses)[number];

export function getClientReleaseDistributionStatusLabel(
  status: string,
  locale?: string,
) {
  const isEnglish = locale?.startsWith("en");
  switch (status) {
    case "pending":
      return isEnglish ? "Pending" : "待同步";
    case "synced":
      return isEnglish ? "Synced" : "已同步";
    case "failed":
      return isEnglish ? "Failed" : "同步失败";
    case "pruned":
      return isEnglish ? "Pruned" : "已清理";
    case "disabled":
      return isEnglish ? "Disabled" : "已停用";
    default:
      return status;
  }
}

export function getClientReleaseDistributionStatusTone(
  status: string,
): AdminStatusTone {
  switch (status) {
    case "synced":
      return "success";
    case "failed":
      return "danger";
    case "pruned":
    case "disabled":
      return "neutral";
    default:
      return "warning";
  }
}

export { formatClientReleaseChannel };
