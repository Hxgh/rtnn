import { BottomTabBar } from "@/components/site/bottom-tab-bar";
import { SiteHeader } from "@/components/site/site-header";
import { readSession } from "@/lib/server/session";

export default async function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await readSession();

  if (!session) {
    return children;
  }

  return (
    <>
      <SiteHeader />
      {children}
      <BottomTabBar />
    </>
  );
}
