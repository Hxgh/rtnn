import { AppChrome } from "@/components/site/app-chrome";
import { readSession } from "@/lib/server/session";

export default async function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await readSession();

  return <AppChrome showTabBar={Boolean(session)}>{children}</AppChrome>;
}
