"use client";

import { usePreferences } from "@/src/components/providers/preferences-provider";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { dictionary } = usePreferences();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4">
      <Card className="w-full text-center">
        <CardHeader>
          <p className="text-xs uppercase tracking-[0.14em] text-amber-600 dark:text-amber-300">
            {dictionary.states.runtimeError}
          </p>
          <CardTitle>{dictionary.states.unexpectedFailure}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{error.message}</p>
          <Button type="button" variant="outline" onClick={reset}>
            {dictionary.common.retry}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
