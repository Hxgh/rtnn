import type { Metadata } from "next";
import { TEMPLATE_DISPLAY } from "@rtnn/config";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import { getServerPreferencesFromRequest } from "@/lib/i18n/server";
import "./globals.css";

export const metadata: Metadata = {
  title: TEMPLATE_DISPLAY.appZh,
  description: TEMPLATE_DISPLAY.appZh,
  icons: {
    icon: "/brand/brand-mark.svg",
    shortcut: "/brand/brand-mark.svg",
    apple: "/brand/brand-mark.svg",
  },
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
          {children}
        </PreferencesProvider>
      </body>
    </html>
  );
}
