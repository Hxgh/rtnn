"use client";

import { useRouter } from "next/navigation";
import { FormSelect } from "@/src/components/admin/form-select";

export function AdminPageSizeSelect({
  ariaLabel,
  options,
  value,
  triggerClassName,
}: {
  ariaLabel: string;
  options: ReadonlyArray<{
    href: string;
    label: string;
    value: string;
  }>;
  value: string;
  triggerClassName?: string;
}) {
  const router = useRouter();

  return (
    <FormSelect
      ariaLabel={ariaLabel}
      defaultValue={value}
      name="pageSize"
      onValueChange={(nextValue) => {
        const nextOption = options.find((option) => option.value === nextValue);
        if (!nextOption) {
          return;
        }
        router.push(nextOption.href);
      }}
      options={options}
      triggerClassName={triggerClassName ?? "w-[88px]"}
    />
  );
}
