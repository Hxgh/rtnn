import Link from "next/link";
import { BrandLogoMark } from "@/components/brand/brand-logo";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AppMessages } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type LoginMessages = AppMessages["login"];

export function MobileLoginForm({
  action,
  errorMessage,
  messages,
  redirectTo,
}: {
  action: (formData: FormData) => void | Promise<void>;
  errorMessage?: string | null;
  messages: LoginMessages;
  redirectTo: string;
}) {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-[28rem] flex-col px-6 pt-[calc(var(--rtnn-safe-top)+0.875rem)] pb-[var(--rtnn-page-bottom)]">
      <div className="flex h-11 items-center justify-between">
        <Link
          href="/"
          className="flex size-10 items-center justify-center rounded-full text-foreground active:bg-secondary"
          aria-label={messages.backHome}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          >
            <path d="M15 18 9 12l6-6" />
          </svg>
        </Link>
        <span className="w-10" aria-hidden="true" />
      </div>

      <section className="flex flex-1 flex-col justify-center py-8">
        <div className="space-y-8">
          <header className="space-y-5">
            <BrandLogoMark className="size-12" />
            <div className="space-y-2">
              <h1 className="text-[2rem] font-semibold leading-tight tracking-normal text-foreground">
                {messages.title}
              </h1>
              <p className="max-w-[20rem] text-[15px] leading-6 text-muted-foreground">
                {messages.description}
              </p>
            </div>
          </header>

          <div className="space-y-6">
            <div className="inline-flex rounded-full bg-secondary p-1">
              <span className="rounded-full bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm">
                {messages.passwordLogin}
              </span>
            </div>

            <form action={action} className="space-y-6">
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <div className="space-y-1">
                <Label className="sr-only" htmlFor="email">
                  {messages.email}
                </Label>
                <Input
                  id="email"
                  type="email"
                  name="email"
                  required
                  autoComplete="username"
                  inputMode="email"
                  placeholder={messages.email}
                  className="h-14 rounded-none border-x-0 border-t-0 border-b bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
                />
              </div>
              <div className="space-y-1">
                <Label className="sr-only" htmlFor="password">
                  {messages.password}
                </Label>
                <Input
                  id="password"
                  type="password"
                  name="password"
                  required
                  autoComplete="current-password"
                  placeholder={messages.password}
                  className="h-14 rounded-none border-x-0 border-t-0 border-b bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
                />
              </div>

              {errorMessage ? (
                <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm leading-5 text-destructive">
                  {errorMessage}
                </p>
              ) : null}

              <button
                type="submit"
                className={cn(
                  buttonVariants({ size: "lg", className: "mt-2 h-12 w-full rounded-xl" }),
                )}
              >
                {messages.submit}
              </button>
            </form>
          </div>
        </div>
      </section>

      <p className="pb-2 text-center text-xs leading-5 text-muted-foreground">
        {messages.resetByAdmin}
      </p>
    </main>
  );
}
