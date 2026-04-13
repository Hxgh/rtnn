import Link from "next/link";
import { buttonVariants } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { getAdminI18n } from "@/src/i18n/server";
import { adminRoutes } from "@/src/lib/admin-routes";
import { cn } from "@/src/lib/utils";

export default async function NotFound() {
  const { dictionary } = await getAdminI18n();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4">
      <Card className="w-full text-center">
        <CardHeader>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">404</p>
          <CardTitle>{dictionary.states.pageNotFound}</CardTitle>
          <CardDescription>{dictionary.states.pageNotFoundDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href={adminRoutes.dashboard}
            className={cn(buttonVariants({ variant: "outline" }), "mt-2")}
          >
            {dictionary.states.goDashboard}
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
