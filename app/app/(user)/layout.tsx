import { BottomTabBar } from "@/components/site/bottom-tab-bar";
import { SiteHeader } from "@/components/site/site-header";

export default async function UserLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <SiteHeader />
      {children}
      <BottomTabBar />
    </>
  );
}
