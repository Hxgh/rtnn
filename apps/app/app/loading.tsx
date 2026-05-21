export default function GlobalLoading() {
  return (
    <div
      aria-label="Loading"
      className="mx-auto grid min-h-dvh w-full max-w-[28rem] grid-rows-[auto_1fr_auto] bg-background text-foreground"
      role="status"
    >
      <div className="border-b border-border/65 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.9rem)]">
        <div className="mx-auto h-3 w-24 rounded-full bg-secondary" />
      </div>
      <div className="space-y-4 px-4 py-5">
        <div className="h-20 rounded-2xl bg-secondary/70" />
        <div className="space-y-2 rounded-2xl border border-border/70 bg-card p-4">
          <div className="h-3 w-28 rounded-full bg-secondary" />
          <div className="h-3 w-full rounded-full bg-secondary" />
          <div className="h-3 w-2/3 rounded-full bg-secondary" />
        </div>
      </div>
      <div className="h-[calc(3.5rem+env(safe-area-inset-bottom))] border-t border-border/65 bg-background" />
    </div>
  );
}
