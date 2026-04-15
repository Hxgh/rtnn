"use client";

import { useEffect } from "react";
import { usePreferences } from "@/components/providers/preferences-provider";
import { PageShell } from "@/components/site/page-shell";
import { StatePanel } from "@/components/site/state-panel";

export default function GlobalError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { error, reset } = props;
  const { messages } = usePreferences();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageShell className="pt-8">
      <StatePanel
        code={messages.error.code}
        title={messages.error.title}
        description={messages.error.description}
        actionLabel={messages.common.actions.retry}
        actionType="button"
        onAction={reset}
        danger
      />
    </PageShell>
  );
}
