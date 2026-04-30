"use server";

import { revalidatePath } from "next/cache";
import { updateClientReleasePolicy } from "@/src/lib/api-client";
import { adminRoutes } from "@/src/lib/admin-routes";
import { assertPermission } from "@/src/lib/permissions";
import { requireUserSession } from "@/src/lib/session";

function optionalString(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function checkboxValue(value: FormDataEntryValue | null) {
  return String(value ?? "").trim() === "true";
}

export async function updateClientReleasePolicyAction(formData: FormData) {
  const { me, accessToken } = await requireUserSession();
  assertPermission(me, "admin:client-releases:manage-policy");

  const releaseId = String(formData.get("releaseId") ?? "").trim();
  const policyId = String(formData.get("policyId") ?? "").trim();
  if (!releaseId || !policyId) {
    return;
  }

  await updateClientReleasePolicy(accessToken, releaseId, policyId, {
    enabled: checkboxValue(formData.get("enabled")),
    recommendedReleaseId: optionalString(formData.get("recommendedReleaseId")),
    minimumSupportedVersion: optionalString(formData.get("minimumSupportedVersion")),
    forceUpdate: checkboxValue(formData.get("forceUpdate")),
    allowGithubFallback: checkboxValue(formData.get("allowGithubFallback")),
    notes: optionalString(formData.get("notes")),
  });

  revalidatePath(adminRoutes.clientReleases.detail(releaseId));
}
