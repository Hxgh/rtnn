import type { ReactNode } from "react";
import Link from "next/link";
import { DataPanel, PageFrame } from "@/src/components/admin/page-frame";
import { buttonVariants } from "@/src/components/ui/button";
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
          <div className="p-4 text-sm text-muted-foreground">{emptyText}</div>
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
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 px-2")}
    >
      {children}
    </Link>
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
  const pageItems = buildPageItems(currentPage, totalPages);
  const pageSizeOptions = resolvePageSizeOptions(pageSize);

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>
          {totalItemsLabel}: {total}
        </span>
        <span>
          {currentPage} / {totalPages}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">{itemsPerPageLabel}</span>
        {pageSizeOptions.map((option) =>
          option === pageSize ? (
            <span key={option} className={buttonVariants({ size: "sm" })}>
              {option}
            </span>
          ) : (
            <Link
              key={option}
              href={getPageSizeHref(option)}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {option}
            </Link>
          ),
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {prevPage >= 1 ? (
          <Link
            href={getPageHref(prevPage)}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {previousLabel}
          </Link>
        ) : null}
        {pageItems.map((item, index) =>
          item === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="px-2 text-xs text-muted-foreground"
            >
              ...
            </span>
          ) : item === currentPage ? (
            <span
              key={item}
              aria-current="page"
              className={buttonVariants({ size: "sm" })}
            >
              {item}
            </span>
          ) : (
            <Link
              key={item}
              href={getPageHref(item)}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {item}
            </Link>
          ),
        )}
        {nextPage <= totalPages ? (
          <Link
            href={getPageHref(nextPage)}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {nextLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function buildPageItems(
  currentPage: number,
  totalPages: number,
): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "ellipsis",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "ellipsis",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis",
    totalPages,
  ];
}
