import { cn } from "@/lib/utils";

export function Card(props: {
  children: React.ReactNode;
  className?: string;
}) {
  const { children, className } = props;
  return (
    <div
      className={cn(
        "rounded-[1.25rem] border bg-card text-card-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader(props: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("flex flex-col space-y-1.5 p-6", props.className)}>{props.children}</div>;
}

export function CardTitle(props: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3 className={cn("text-2xl font-semibold leading-none tracking-tight", props.className)}>
      {props.children}
    </h3>
  );
}

export function CardDescription(props: {
  children: React.ReactNode;
  className?: string;
}) {
  return <p className={cn("text-sm text-muted-foreground", props.className)}>{props.children}</p>;
}

export function CardContent(props: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("p-6 pt-0", props.className)}>{props.children}</div>;
}

export function CardFooter(props: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("flex items-center p-6 pt-0", props.className)}>{props.children}</div>;
}

export function SurfaceCard(props: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "border-border/80 bg-card",
        props.className,
      )}
    >
      {props.children}
    </Card>
  );
}
