import Link from "next/link";
import { RouteStateBlock } from "@/src/components/admin/state-block";
import { buttonVariants } from "@/src/components/ui/button";
import { getAdminI18n } from "@/src/i18n/server";
import { adminRoutes } from "@/src/lib/admin-routes";
import { cn } from "@/src/lib/utils";

export default async function NotFound() {
  const { dictionary } = await getAdminI18n();

  return (
    <RouteStateBlock
      action={(
        <Link
          href={adminRoutes.dashboard}
          className={cn(buttonVariants({ variant: "outline" }), "mt-2")}
        >
          {dictionary.states.goDashboard}
        </Link>
      )}
      detail={dictionary.states.pageNotFoundDescription}
      label="404"
      title={dictionary.states.pageNotFound}
    />
  );
}
