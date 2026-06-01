import { notFound } from "next/navigation";
import { API_PERMISSIONS } from "@rtnn/shared-types";
import { PageFrame } from "@/src/components/admin/page-frame";
import { ErrorBlock } from "@/src/components/admin/state-block";
import { getAdminI18n } from "@/src/i18n/server";
import { getClientReleaseById } from "@/src/lib/api-client";
import { resolveErrorMessage } from "@/src/lib/errors";
import { assertPermission, hasPermission } from "@/src/lib/permissions";
import { requireUserSession } from "@/src/lib/session";
import {
  ClientReleasePackagesPanel,
  ClientReleasePolicyPanel,
  ClientReleasePolicyStatusAlert,
  ClientReleaseSummaryPanel,
} from "../detail-components";

export default async function ClientReleaseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ policyStatus?: string }>;
}) {
  const sessionPromise = requireUserSession();
  const i18nPromise = getAdminI18n();
  const paramsPromise = params;
  const policyStatusPromise = searchParams;

  const { me, accessToken } = await sessionPromise;
  assertPermission(me, API_PERMISSIONS.adminClientReleasesView);
  const canManagePolicy = hasPermission(
    me,
    API_PERMISSIONS.adminClientReleasesManagePolicy,
  );

  const [{ id }, policyStatusState] = await Promise.all([
    paramsPromise,
    policyStatusPromise,
  ]);
  const releaseState = await getClientReleaseById(accessToken, id)
    .then((data) => ({ data, error: null }))
    .catch((error: unknown) => ({ data: null, error }));
  const { dictionary, locale } = await i18nPromise;

  if (releaseState.error) {
    const status =
      typeof releaseState.error === "object" &&
      releaseState.error &&
      "status" in releaseState.error
        ? Number((releaseState.error as { status?: unknown }).status)
        : 0;
    if (status === 404) {
      notFound();
    }

    return (
      <ErrorBlock
        text={dictionary.states.apiUnavailable}
        detail={resolveErrorMessage(releaseState.error)}
      />
    );
  }

  if (!releaseState.data) {
    return (
      <ErrorBlock
        text={dictionary.states.apiUnavailable}
        detail={resolveErrorMessage(releaseState.error)}
      />
    );
  }

  const release = releaseState.data;

  return (
    <PageFrame
      title={dictionary.clientReleases.detailTitle}
      subtitle={release.releaseVersion}
    >
      <div className="space-y-3">
        <ClientReleasePolicyStatusAlert
          dictionary={dictionary}
          status={policyStatusState?.policyStatus}
        />
        <ClientReleaseSummaryPanel
          dictionary={dictionary}
          locale={locale}
          release={release}
        />
        <ClientReleasePackagesPanel
          dictionary={dictionary}
          locale={locale}
          release={release}
        />
        <ClientReleasePolicyPanel
          canManagePolicy={canManagePolicy}
          dictionary={dictionary}
          locale={locale}
          release={release}
        />
      </div>
    </PageFrame>
  );
}
