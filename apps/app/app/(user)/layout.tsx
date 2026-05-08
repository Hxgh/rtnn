import { AppChrome } from "@/components/site/app-chrome";

export default async function UserLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppChrome>{children}</AppChrome>;
}
