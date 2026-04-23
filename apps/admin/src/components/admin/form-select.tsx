"use client";

import { Fragment, useRef } from "react";
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
  const inputRef = useRef<HTMLInputElement>(null);
  const selectDefaultValue =
    defaultValue === ""
      ? emptyLabel
        ? EMPTY_SELECT_VALUE
        : undefined
      : defaultValue;

  const handleValueChange = (nextValue: string) => {
    const resolvedValue =
      nextValue === EMPTY_SELECT_VALUE ? "" : nextValue;
    if (inputRef.current) {
      inputRef.current.value = resolvedValue;
    }
    onValueChange?.(resolvedValue);

    if (autoSubmit) {
      requestAnimationFrame(() => {
        inputRef.current?.form?.requestSubmit();
      });
    }
  };

  return (
    <Fragment key={defaultValue}>
      <input
        ref={inputRef}
        defaultValue={defaultValue}
        name={name}
        type="hidden"
      />
      <Select
        defaultValue={selectDefaultValue}
        onValueChange={handleValueChange}
      >
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
    </Fragment>
  );
}
