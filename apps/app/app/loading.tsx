export default function GlobalLoading() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-x-0 top-[var(--rtnn-safe-top)] z-50 mx-auto h-0.5 w-full max-w-[28rem] overflow-hidden bg-transparent"
    >
      <span className="block h-full w-1/2 animate-pulse rounded-full bg-foreground/35" />
    </div>
  );
}
