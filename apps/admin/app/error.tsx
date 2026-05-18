"use client";

import { usePreferences } from "@/src/components/providers/preferences-provider";
import { RouteStateBlock } from "@/src/components/admin/state-block";
import { Button } from "@/src/components/ui/button";

export default function RootError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { dictionary } = usePreferences();

  return (
    <RouteStateBlock
      action={(
        <Button type="button" variant="outline" onClick={reset}>
          {dictionary.common.retry}
        </Button>
      )}
      detail={dictionary.states.unexpectedFailure}
      label={dictionary.states.runtimeError}
      title={dictionary.states.apiUnavailable}
      variant="error"
    />
  );
}
