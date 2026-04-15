import { cn } from "@/lib/utils";

const baseClassName = cn(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium",
  "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  "active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50",
);

const variantClassName = {
  default: "bg-foreground text-background shadow-sm hover:bg-foreground/92",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  outline:
    "border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
  ghost: "text-foreground hover:bg-accent hover:text-accent-foreground",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  link: "text-foreground underline-offset-4 hover:underline",
} as const;

const sizeClassName = {
  default: "h-11 rounded-xl px-4 py-2.5",
  sm: "h-9 rounded-md px-3",
  lg: "h-12 rounded-xl px-8",
  icon: "h-10 w-10",
} as const;

type ButtonVariant = keyof typeof variantClassName;
type ButtonSize = keyof typeof sizeClassName;

export function buttonVariants(props?: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const variant = props?.variant ?? "default";
  const size = props?.size ?? "default";
  return cn(baseClassName, variantClassName[variant], sizeClassName[size], props?.className);
}

export function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
  },
) {
  const {
    className,
    variant = "default",
    size = "default",
    type = "button",
    ...rest
  } = props;
  return (
    <button
      type={type}
      className={buttonVariants({ variant, size, className })}
      {...rest}
    />
  );
}
