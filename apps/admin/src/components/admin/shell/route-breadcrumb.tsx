"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/src/components/ui/breadcrumb";
import { cn } from "@/src/lib/utils";
import type { AdminDictionary } from "@/src/i18n/dictionaries";
import {
  adminRoutes,
  getAdminSegmentLabelMap,
  isAdminRoutablePath,
} from "@/src/lib/admin-routes";

type RouteCrumb = {
  href: string | null;
  label: string;
};

function formatSegment(
  part: string,
  dictionary: Pick<AdminDictionary, "nav" | "common">,
) {
  const segmentLabels: Record<string, string> = getAdminSegmentLabelMap(dictionary);

  if (segmentLabels[part]) {
    return segmentLabels[part];
  }

  if (/^[a-f0-9-]{8,}$/i.test(part) || /^\d+$/.test(part)) {
    return dictionary.common.detail;
  }

  return part.replaceAll("-", " ");
}

function buildBreadcrumbs(
  pathname: string,
  dictionary: Pick<AdminDictionary, "nav" | "common">,
): RouteCrumb[] {
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length === 0) {
    return [{ href: adminRoutes.dashboard, label: dictionary.nav.overview }];
  }

  return parts.map((part, index) => {
    const href = `/${parts.slice(0, index + 1).join("/")}`;

    return {
      href: isAdminRoutablePath(href) ? href : null,
      label: formatSegment(part, dictionary),
    };
  });
}

export function RouteBreadcrumb({
  dictionary,
}: {
  dictionary: Pick<AdminDictionary, "common" | "nav">;
}) {
  const pathname = usePathname();
  const breadcrumbs = buildBreadcrumbs(pathname, dictionary);
  const currentLabel = breadcrumbs.at(-1)?.label ?? dictionary.nav.overview;

  return (
    <>
      <div className="truncate text-sm font-medium text-foreground md:hidden">
        {currentLabel}
      </div>
      <Breadcrumb ariaLabel={dictionary.common.breadcrumb} className="hidden md:block">
        <BreadcrumbList>
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;

            return (
              <BreadcrumbItem key={crumb.href}>
                {isLast ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : crumb.href ? (
                  <>
                    <BreadcrumbLink asChild>
                      <Link href={crumb.href}>{crumb.label}</Link>
                    </BreadcrumbLink>
                    <BreadcrumbSeparator />
                  </>
                ) : (
                  <>
                    <span className={cn("text-muted-foreground")}>{crumb.label}</span>
                    <BreadcrumbSeparator />
                  </>
                )}
              </BreadcrumbItem>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </>
  );
}
