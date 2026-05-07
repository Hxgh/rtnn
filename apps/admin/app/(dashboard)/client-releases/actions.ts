"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { updateClientReleasePolicy } from "@/src/lib/api-client";
import { adminRoutes } from "@/src/lib/admin-routes";
import { getFormCheckbox, getOptionalFormString } from "@/src/lib/form-data";
import { assertPermission } from "@/src/lib/permissions";
import { requireUserSession } from "@/src/lib/session";

export async function updateClientReleasePolicyAction(formData: FormData) {
  const { me, accessToken } = await requireUserSession();
  assertPermission(me, "admin:client-releases:manage-policy");

  const releaseId = String(formData.get("releaseId") ?? "").trim();
  const policyId = String(formData.get("policyId") ?? "").trim();
  if (!releaseId || !policyId) {
    return;
  }

  const detailPath = adminRoutes.clientReleases.detail(releaseId);

  try {
    await updateClientReleasePolicy(accessToken, releaseId, policyId, {
      enabled: getFormCheckbox(formData, "enabled"),
      recommendedReleaseId: getOptionalFormString(
        formData,
        "recommendedReleaseId",
      ),
      minimumSupportedVersion: getOptionalFormString(
        formData,
        "minimumSupportedVersion",
      ),
      forceUpdate: getFormCheckbox(formData, "forceUpdate"),
      allowGithubFallback: getFormCheckbox(formData, "allowGithubFallback"),
      notes: getOptionalFormString(formData, "notes"),
    });
    revalidatePath(detailPath);
  } catch {
    redirect(`${detailPath}?policyStatus=failed`);
  }

  redirect(`${detailPath}?policyStatus=saved`);
}
