import type { Metadata } from "next";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import { getServerPreferencesFromRequest } from "@/lib/i18n/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "rtnn app",
  description: "RTNN 客户端",
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
