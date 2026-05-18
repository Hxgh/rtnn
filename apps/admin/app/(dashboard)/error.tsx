"use client";

import { usePreferences } from "@/src/components/providers/preferences-provider";
import { AdminStateBlock } from "@/src/components/admin/state-block";
import { Button } from "@/src/components/ui/button";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { dictionary } = usePreferences();

  return (
    <AdminStateBlock
      action={(
        <Button type="button" variant="outline" onClick={reset}>
          {dictionary.common.retry}
        </Button>
      )}
      detail={dictionary.states.unexpectedFailure}
      text={dictionary.states.dashboardError}
      variant="error"
    />
  );
}
