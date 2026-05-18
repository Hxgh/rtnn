import Link from "next/link";
import { RouteStateBlock } from "@/src/components/admin/state-block";
import { buttonVariants } from "@/src/components/ui/button";
import { getAdminI18n } from "@/src/i18n/server";
import { adminRoutes } from "@/src/lib/admin-routes";
import { cn } from "@/src/lib/utils";

export default async function ForbiddenPage() {
  const { dictionary } = await getAdminI18n();

  return (
    <RouteStateBlock
      action={(
        <Link
          href={adminRoutes.dashboard}
          className={cn(buttonVariants({ variant: "outline" }), "mt-2")}
        >
          {dictionary.footer.backToDashboard}
        </Link>
      )}
      detail={dictionary.states.accessDeniedDescription}
      label="403"
      title={dictionary.states.accessDenied}
      variant="warning"
    />
  );
}
