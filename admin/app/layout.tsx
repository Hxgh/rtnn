import type { Metadata } from "next";
import { PreferencesProvider } from "@/src/components/providers/preferences-provider";
import { getAdminI18n, getAdminPreferencesFromRequest } from "@/src/i18n/server";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { dictionary } = await getAdminI18n();

  return {
    title: dictionary.common.appName,
    description: dictionary.auth.description,
    icons: {
      icon: "/brand/rtnn-mark.svg",
      shortcut: "/brand/rtnn-mark.svg",
      apple: "/brand/rtnn-mark.svg",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, theme } = await getAdminPreferencesFromRequest();
  return (
    <html
      lang={locale}
      className={theme === "dark" ? "dark" : undefined}
      suppressHydrationWarning
    >
      <body className="min-h-svh antialiased">
        <PreferencesProvider defaultLocale={locale} defaultTheme={theme}>
          {children}
        </PreferencesProvider>
      </body>
    </html>
  );
}
