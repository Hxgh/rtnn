import { loginAction } from "./actions";
import Link from "next/link";
import { BottomActionBar } from "@/components/site/bottom-action-bar";
import { BrandLogoLockup } from "@/components/brand/brand-logo";
import { PageShell, PageTitle } from "@/components/site/page-shell";
import { buttonVariants } from "@/components/ui/button";
import {
  CardContent,
  SurfaceCard,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getServerI18n } from "@/lib/i18n/server";
import { readSession } from "@/lib/server/session";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; redirectTo?: string }>;
}) {
  const session = await readSession({ redirectTo: "/login" });
  if (session) {
    redirect("/");
  }

  const { messages } = await getServerI18n();
  const params = searchParams ? await searchParams : undefined;
  const redirectTo = params?.redirectTo?.startsWith("/") ? params.redirectTo : "/";
  const errorMessage =
    params?.error === "invalid"
      ? messages.login.invalid
      : params?.error === "required"
        ? messages.login.required
        : params?.error === "expired"
          ? messages.login.expired
          : null;

  return (
    <PageShell className="space-y-6 pt-8" withBottomInset>
      <div className="space-y-4">
        <Link
          href="/"
          className={buttonVariants({ variant: "ghost", size: "sm", className: "h-8 px-0" })}
        >
          {messages.common.actions.backHome}
        </Link>
        <div className="space-y-4">
          <BrandLogoLockup subtitle={messages.home.badge} />
          <PageTitle
            title={messages.login.title}
            description={messages.login.description}
          />
        </div>
      </div>

      <SurfaceCard className="overflow-hidden">
        <CardContent className="pt-6">
          <form id="login-form" action={loginAction} className="space-y-4">
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <div className="space-y-2">
              <Label htmlFor="email">{messages.login.email}</Label>
              <Input
                id="email"
                type="email"
                name="email"
                required
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{messages.login.password}</Label>
              <Input
                id="password"
                type="password"
                name="password"
                required
                autoComplete="current-password"
              />
            </div>
            {errorMessage ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errorMessage}
              </p>
            ) : null}
          </form>
        </CardContent>
      </SurfaceCard>

      <BottomActionBar>
        <button
          type="submit"
          form="login-form"
          className={cn(buttonVariants({ className: "w-full" }))}
        >
          {messages.login.submit}
        </button>
      </BottomActionBar>
    </PageShell>
  );
}
