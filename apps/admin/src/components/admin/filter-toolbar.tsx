import type { ReactNode } from "react";

export function AdminFilterToolbar({ children }: { children: ReactNode }) {
  return (
    <form className="flex flex-col gap-3 lg:flex-row lg:items-center" method="get">
      {children}
    </form>
  );
}

export function AdminFilterActions({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-2">{children}</div>;
}
