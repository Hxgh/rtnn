import { cn } from "@/lib/utils";

export function PageShell(props: {
  children: React.ReactNode;
  className?: string;
  withBottomInset?: boolean;
}) {
  const { children, className, withBottomInset = false } = props;
  return (
    <main
      className={cn(
        "mx-auto w-full max-w-[28rem] px-4 pt-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]",
        withBottomInset && "pb-[calc(6.5rem+env(safe-area-inset-bottom))]",
        className,
      )}
    >
      {children}
    </main>
  );
}

export function PageTitle(props: {
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <header className={cn("space-y-2", props.className)}>
      <h1 className="text-[1.75rem] font-semibold tracking-tight text-foreground">
        {props.title}
      </h1>
      {props.description ? (
        <p className="text-sm leading-6 text-muted-foreground">{props.description}</p>
      ) : null}
    </header>
  );
}

export function PageSection(props: {
  title?: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("space-y-3", props.className)}>
      {props.title ? <h2 className="text-sm font-medium text-foreground">{props.title}</h2> : null}
      {props.description ? (
        <p className="text-xs leading-5 text-muted-foreground">{props.description}</p>
      ) : null}
      {props.children}
    </section>
  );
}
