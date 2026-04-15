"use client";

import { useEffect, useRef, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";

const EMPTY_SELECT_VALUE = "__empty__";

type FormSelectOption = {
  label: string;
  value: string;
};

export function FormSelect({
  ariaLabel,
  autoSubmit = false,
  defaultValue = "",
  emptyLabel,
  id,
  name,
  onValueChange,
  options,
  placeholder,
  triggerClassName,
}: {
  ariaLabel: string;
  autoSubmit?: boolean;
  defaultValue?: string;
  emptyLabel?: string;
  id?: string;
  name: string;
  onValueChange?: (value: string) => void;
  options: readonly FormSelectOption[];
  placeholder?: string;
  triggerClassName?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  const selectValue =
    value === "" && emptyLabel ? EMPTY_SELECT_VALUE : value;

  const handleValueChange = (nextValue: string) => {
    const resolvedValue =
      nextValue === EMPTY_SELECT_VALUE ? "" : nextValue;
    setValue(resolvedValue);
    onValueChange?.(resolvedValue);

    if (autoSubmit) {
      requestAnimationFrame(() => {
        inputRef.current?.form?.requestSubmit();
      });
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        name={name}
        type="hidden"
        value={value}
      />
      <Select value={selectValue} onValueChange={handleValueChange}>
        <SelectTrigger
          aria-label={ariaLabel}
          className={triggerClassName}
          id={id}
        >
          <SelectValue placeholder={placeholder ?? emptyLabel} />
        </SelectTrigger>
        <SelectContent>
          {emptyLabel ? (
            <SelectItem value={EMPTY_SELECT_VALUE}>{emptyLabel}</SelectItem>
          ) : null}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
