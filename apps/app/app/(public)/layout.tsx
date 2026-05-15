import { AppChrome } from "@/components/site/app-chrome";

export default async function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppChrome showTabBar={false}>{children}</AppChrome>;
}
