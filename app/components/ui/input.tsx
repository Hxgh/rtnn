import { cn } from "@/lib/utils";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, type = "text", ...rest } = props;
  return (
    <input
      type={type}
      className={cn(
        "flex h-12 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm",
        "ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...rest}
    />
  );
}
