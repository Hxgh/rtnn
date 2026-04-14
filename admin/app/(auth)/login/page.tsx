import { loginAction } from "@/app/(auth)/login/actions";
import { TEMPLATE_DEFAULTS, TEMPLATE_DISPLAY } from "@rtnn/config";
import { RtnnLogoLockup, RtnnLogoMark } from "@/src/components/brand/rtnn-logo";
import { LoginHeroCanvas } from "@/src/components/auth/login-hero-canvas";
import { LoginForm } from "@/src/components/auth/login-form";
import { PreferenceControls } from "@/src/components/admin/preference-controls";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { getAdminI18n } from "@/src/i18n/server";

export default async function LoginPage() {
  const { dictionary } = await getAdminI18n();
  const defaultAdmin = TEMPLATE_DEFAULTS.admin;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1320px] flex-col px-4 py-6">
      <div className="flex items-center justify-between gap-4">
        <RtnnLogoLockup subtitle={dictionary.auth.brand} title={TEMPLATE_DISPLAY.brand} />
        <PreferenceControls dictionary={dictionary.common} />
      </div>

      <div className="grid flex-1 gap-6 py-8 lg:grid-cols-[minmax(0,1.2fr)_420px] lg:items-stretch lg:py-10">
        <section className="relative hidden min-h-[680px] overflow-hidden lg:block">
          <div
            className="absolute inset-0"
            style={{
              WebkitMaskImage:
                "radial-gradient(ellipse 92% 86% at 38% 50%, black 56%, transparent 100%)",
              maskImage:
                "radial-gradient(ellipse 92% 86% at 38% 50%, black 56%, transparent 100%)",
            }}
          >
            <LoginHeroCanvas />
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
          <Card className="animate-fade-up w-full max-w-sm border-border/50 bg-card/88 shadow-xl backdrop-blur-xl">
            <CardHeader className="gap-2">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                <RtnnLogoMark className="size-5" />
                <span>{dictionary.auth.brand}</span>
              </div>
              <CardTitle className="text-xl">{dictionary.auth.signIn}</CardTitle>
              <CardDescription>{dictionary.auth.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <LoginForm
                action={loginAction}
                dictionary={{ auth: dictionary.auth, common: dictionary.common }}
                defaultEmail={defaultAdmin.email}
                defaultPassword={defaultAdmin.password}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
