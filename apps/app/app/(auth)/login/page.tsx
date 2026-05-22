import { loginAction } from "./actions";
import { MobileLoginForm } from "@/components/auth/mobile-login-form";
import { getServerI18n } from "@/lib/i18n/server";
import { normalizeSafeRedirectPath } from "@/lib/server/redirects";
import { readSession } from "@/lib/server/session";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; redirectTo?: string }>;
}) {
  const session = await readSession({ redirectTo: "/login" });
  if (session) {
    redirect("/home");
  }

  const { messages } = await getServerI18n();
  const params = searchParams ? await searchParams : undefined;
  const redirectTo = normalizeSafeRedirectPath(params?.redirectTo);
  const errorMessage =
    params?.error === "invalid"
      ? messages.login.invalid
      : params?.error === "required"
        ? messages.login.required
        : params?.error === "expired"
          ? messages.login.expired
          : null;

  return (
    <MobileLoginForm
      action={loginAction}
      errorMessage={errorMessage}
      messages={messages.login}
      redirectTo={redirectTo}
    />
  );
}
