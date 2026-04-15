import { Skeleton } from "@/src/components/ui/skeleton";

export function LoginLoadingShell() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1320px] flex-col px-4 py-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-28 rounded-full bg-foreground/10 dark:bg-foreground/12" />
          <Skeleton className="h-3 w-20 rounded-full bg-foreground/7 dark:bg-foreground/10" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="size-8 rounded-full bg-foreground/8 dark:bg-foreground/12" />
          <Skeleton className="size-8 rounded-full bg-foreground/8 dark:bg-foreground/12" />
        </div>
      </div>

      <div className="grid flex-1 gap-6 py-8 lg:grid-cols-[minmax(0,1.2fr)_420px] lg:items-stretch lg:py-10">
        <section className="relative hidden min-h-[680px] overflow-hidden lg:block">
          <div className="absolute inset-0">
            <div className="absolute left-[12%] top-[24%] h-[24rem] w-[24rem] rounded-full bg-foreground/6 blur-3xl dark:bg-foreground/8" />
            <div className="absolute left-[22%] top-[36%] h-[12rem] w-[26rem] -rotate-12 rounded-full border border-foreground/10 dark:border-foreground/12" />
            <div className="absolute left-[20%] top-[34%] h-[18rem] w-[34rem] -rotate-12 rounded-full border border-foreground/7 dark:border-foreground/10" />
            <div className="absolute right-[18%] top-[20%] h-24 w-24 rounded-full bg-foreground/10 blur-2xl dark:bg-foreground/12" />
            <div className="absolute right-[21%] top-[24%] h-[4.5rem] w-[4.5rem] rounded-full border border-foreground/14 dark:border-foreground/16" />
            <div className="absolute right-[28%] top-[48%] size-2 rounded-full bg-foreground/18 dark:bg-foreground/24" />
            <div className="absolute left-[16%] top-[18%] size-1.5 rounded-full bg-foreground/14 dark:bg-foreground/20" />
            <div className="absolute left-[32%] top-[62%] size-1 rounded-full bg-foreground/14 dark:bg-foreground/20" />
            <div className="absolute right-[34%] bottom-[18%] size-1.5 rounded-full bg-foreground/12 dark:bg-foreground/18" />
          </div>
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, transparent 64%, var(--background) 100%)",
            }}
          />
        </section>

        <div className="flex items-center justify-center lg:justify-end">
          <section className="w-full max-w-sm rounded-3xl border border-border/50 bg-card/88 p-6 shadow-xl backdrop-blur-xl">
            <div className="space-y-2">
              <Skeleton className="h-3 w-24 rounded-full bg-foreground/8 dark:bg-foreground/12" />
              <Skeleton className="h-7 w-[4.5rem] rounded-full bg-foreground/12 dark:bg-foreground/16" />
              <Skeleton className="h-4 w-44 rounded-full bg-foreground/7 dark:bg-foreground/10" />
            </div>

            <div className="mt-6 grid gap-4">
              <div className="grid gap-2">
                <Skeleton className="h-3.5 w-10 rounded-full bg-foreground/8 dark:bg-foreground/12" />
                <Skeleton className="h-10 w-full rounded-xl bg-foreground/8 dark:bg-foreground/12" />
              </div>
              <div className="grid gap-2">
                <Skeleton className="h-3.5 w-10 rounded-full bg-foreground/8 dark:bg-foreground/12" />
                <Skeleton className="h-10 w-full rounded-xl bg-foreground/8 dark:bg-foreground/12" />
              </div>
              <Skeleton className="mt-1 h-10 w-full rounded-xl bg-foreground/12 dark:bg-foreground/16" />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
