export default function GlobalLoading() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto flex h-12 w-full max-w-[28rem] items-center justify-center"
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/45" />
    </div>
  );
}
