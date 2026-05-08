import { AppChrome } from "@/components/site/app-chrome";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AppChrome showHeader={false} showTabBar={false}>
      {children}
    </AppChrome>
  );
}
