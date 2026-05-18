import { loginAction } from "@/app/(auth)/login/actions";
import { TEMPLATE_DISPLAY } from "@rtnn/config";
import { BrandLogoLockup } from "@/src/components/brand/brand-logo";
import { LoginHeroCanvas } from "@/src/components/auth/login-hero-canvas";
import { LoginForm } from "@/src/components/auth/login-form";
import { PreferenceControls } from "@/src/components/admin/preference-controls";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { getAdminI18n } from "@/src/i18n/server";

export default async function LoginPage() {
  const { dictionary } = await getAdminI18n();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1320px] flex-col px-4 py-6">
      <div className="flex items-center justify-between gap-4">
        <BrandLogoLockup subtitle={dictionary.auth.brand} title={TEMPLATE_DISPLAY.brand} />
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
            <CardHeader>
              <CardTitle className="text-xl">{dictionary.auth.signIn}</CardTitle>
            </CardHeader>
            <CardContent>
              <LoginForm
                action={loginAction}
                dictionary={{ auth: dictionary.auth, common: dictionary.common }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
