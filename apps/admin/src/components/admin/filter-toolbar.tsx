import type { ReactNode } from "react";

export function AdminFilterToolbar({ children }: { children: ReactNode }) {
  return (
    <form className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center" method="get">
      {children}
    </form>
  );
}

export function AdminFilterActions({ children }: { children: ReactNode }) {
  return <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">{children}</div>;
}
