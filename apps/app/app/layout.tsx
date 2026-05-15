import type { Metadata, Viewport } from "next";
import { TEMPLATE_DISPLAY } from "@rtnn/config";
import { NativeRuntimeProvider } from "@/components/providers/native-runtime-provider";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import { getServerPreferencesFromRequest } from "@/lib/i18n/server";
import "./globals.css";

export const metadata: Metadata = {
  title: TEMPLATE_DISPLAY.brand,
  description: TEMPLATE_DISPLAY.brand,
  icons: {
    icon: "/brand/brand-mark.svg",
    shortcut: "/brand/brand-mark.svg",
    apple: "/brand/brand-mark.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { locale, theme } = await getServerPreferencesFromRequest();
  return (
    <html
      lang={locale}
      className={theme === "dark" ? "dark" : undefined}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <PreferencesProvider
          key={`${locale}:${theme}`}
          initialLocale={locale}
          initialTheme={theme}
        >
          <NativeRuntimeProvider>{children}</NativeRuntimeProvider>
        </PreferencesProvider>
      </body>
    </html>
  );
}
