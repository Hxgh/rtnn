import { Card, CardContent } from "@/src/components/ui/card";

export function EmptyBlock({ text }: { text: string }) {
  return (
    <Card className="border-dashed border-border/70 bg-card shadow-sm">
      <CardContent className="p-6 text-sm text-muted-foreground">{text}</CardContent>
    </Card>
  );
}

export function ErrorBlock({
  text,
  detail,
}: {
  text: string;
  detail?: string;
}) {
  return (
    <Card className="border-amber-300/45 bg-amber-50/60 dark:border-amber-400/30 dark:bg-amber-900/10">
      <CardContent className="space-y-2 p-6">
        <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">{text}</p>
        {detail ? (
          <p className="text-xs text-amber-700/80 dark:text-amber-300/80">{detail}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
