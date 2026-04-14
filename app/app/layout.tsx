import type { Metadata } from "next";
import { TEMPLATE_DISPLAY, TEMPLATE_IDENTITY } from "@rtnn/config";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import { getServerPreferencesFromRequest } from "@/lib/i18n/server";
import "./globals.css";

export const metadata: Metadata = {
  title: `${TEMPLATE_IDENTITY.projectId} app`,
  description: TEMPLATE_DISPLAY.appZh,
  icons: {
    icon: "/brand/rtnn-mark.svg",
    shortcut: "/brand/rtnn-mark.svg",
    apple: "/brand/rtnn-mark.svg",
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
        <PreferencesProvider initialLocale={locale} initialTheme={theme}>
          {children}
        </PreferencesProvider>
      </body>
    </html>
  );
}
