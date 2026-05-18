import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AdminPageSizeSelect } from "@/src/components/admin/page-size-select";
import { DataPanel, PageFrame } from "@/src/components/admin/page-frame";
import { AdminStateBlock } from "@/src/components/admin/state-block";
import { Button, buttonVariants } from "@/src/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { resolvePageSizeOptions } from "@/src/lib/pagination";
import { cn } from "@/src/lib/utils";

export type AdminTableColumn<T> = {
  id: string;
  header: ReactNode;
  headerClassName?: string;
  cell: (item: T) => ReactNode;
  cellClassName?: string | ((item: T) => string | undefined);
};

export function AdminTablePage<T>({
  title,
  subtitle,
  actions,
  toolbar,
  pagination,
  emptyText,
  data,
  columns,
  getRowKey,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  toolbar?: ReactNode;
  pagination?: ReactNode;
  emptyText: string;
  data: readonly T[];
  columns: readonly AdminTableColumn<T>[];
  getRowKey: (item: T) => string;
}) {
  return (
    <PageFrame title={title} subtitle={subtitle} actions={actions}>
      <DataPanel>
        {toolbar ? (
          <div className="border-b border-border/70 px-4 py-3">{toolbar}</div>
        ) : null}

        {data.length === 0 ? (
          <AdminStateBlock className="m-4" contentClassName="p-4" text={emptyText} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead key={column.id} className={column.headerClassName}>
                      {column.header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={getRowKey(item)}>
                    {columns.map((column) => (
                      <TableCell
                        key={column.id}
                        className={cn(
                          typeof column.cellClassName === "function"
                            ? column.cellClassName(item)
                            : column.cellClassName,
                        )}
                      >
                        {column.cell(item)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {pagination ? (
          <div className="border-t border-border/70 px-4 py-3">{pagination}</div>
        ) : null}
      </DataPanel>
    </PageFrame>
  );
}

export function AdminTableRowActions({ children }: { children: ReactNode }) {
  return <div className="inline-flex items-center gap-0.5">{children}</div>;
}

export function AdminTableActionLink({
  href,
  children,
  external = false,
}: {
  href: string;
  children: ReactNode;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 px-2")}
      rel={external ? "noreferrer" : undefined}
      target={external ? "_blank" : undefined}
    >
      {children}
    </Link>
  );
}

export function AdminTableActionButton({ children }: { children: ReactNode }) {
  return (
    <Button className="h-7 px-2" size="sm" type="button" variant="ghost">
      {children}
    </Button>
  );
}

export function AdminTablePagination({
  currentPage,
  pageSize,
  total,
  totalPages,
  getPageHref,
  getPageSizeHref,
  totalItemsLabel,
  itemsPerPageLabel,
  nextLabel,
  previousLabel,
}: {
  currentPage: number;
  pageSize: number;
  total: number;
  totalPages: number;
  getPageHref: (page: number) => string;
  getPageSizeHref: (pageSize: number) => string;
  totalItemsLabel: string;
  itemsPerPageLabel: string;
  nextLabel: string;
  previousLabel: string;
}) {
  if (total <= 0) {
    return null;
  }

  const prevPage = currentPage - 1;
  const nextPage = currentPage + 1;
  const pageSizeOptions = resolvePageSizeOptions(pageSize).map((option) => ({
    href: getPageSizeHref(option),
    label: String(option),
    value: String(option),
  }));

  return (
    <div className="flex justify-end">
      <div className="flex w-full flex-wrap items-center justify-end gap-3 rounded-lg border border-border/70 bg-muted/15 px-3 py-3">
        <div className="flex items-center gap-1.5 whitespace-nowrap text-sm">
          <span className="text-muted-foreground">{totalItemsLabel}</span>
          <span className="font-medium text-foreground">{total}</span>
        </div>
        <div className="hidden h-4 w-px bg-border/70 md:block" />
        <div className="flex items-center gap-2 whitespace-nowrap text-sm text-muted-foreground">
          <span>{itemsPerPageLabel}</span>
          <AdminPageSizeSelect
            ariaLabel={itemsPerPageLabel}
            options={pageSizeOptions}
            triggerClassName="h-8 w-[78px]"
            value={String(pageSize)}
          />
        </div>
        <div className="hidden h-4 w-px bg-border/70 md:block" />
        <div className="flex items-center gap-3 whitespace-nowrap">
          <span className="min-w-[52px] text-sm text-muted-foreground">
            {currentPage} / {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            {prevPage >= 1 ? (
              <Link
                href={getPageHref(prevPage)}
                className={cn(buttonVariants({ size: "sm", variant: "outline" }), "h-8 gap-1.5 px-2.5")}
              >
                <ChevronLeft className="size-4" />
                <span>{previousLabel}</span>
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className={cn(
                  buttonVariants({ size: "sm", variant: "outline" }),
                  "pointer-events-none h-8 gap-1.5 px-2.5 opacity-50",
                )}
              >
                <ChevronLeft className="size-4" />
                <span>{previousLabel}</span>
              </span>
            )}
            {nextPage <= totalPages ? (
              <Link
                href={getPageHref(nextPage)}
                className={cn(buttonVariants({ size: "sm", variant: "outline" }), "h-8 gap-1.5 px-2.5")}
              >
                <span>{nextLabel}</span>
                <ChevronRight className="size-4" />
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className={cn(
                  buttonVariants({ size: "sm", variant: "outline" }),
                  "pointer-events-none h-8 gap-1.5 px-2.5 opacity-50",
                )}
              >
                <span>{nextLabel}</span>
                <ChevronRight className="size-4" />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
