"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/src/components/ui/button";
import { DialogClose, DialogFooter } from "@/src/components/ui/dialog";
import { Label } from "@/src/components/ui/label";
import type { AdminDictionary } from "@/src/i18n/dictionaries";
import { cn } from "@/src/lib/utils";

export function AdminDialogSubmitButton({
  label,
  loadingLabel,
}: {
  label: string;
  loadingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} size="sm" type="submit">
      {pending ? loadingLabel : label}
    </Button>
  );
}

export function AdminFormField({
  children,
  className,
  error,
  htmlFor,
  label,
  message,
  reserveMessage = true,
}: {
  children: ReactNode;
  className?: string;
  error?: boolean;
  htmlFor: string;
  label: string;
  message?: ReactNode;
  reserveMessage?: boolean;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {reserveMessage ? (
        <div className={cn("min-h-3 text-[11px] text-destructive", !error && "opacity-0")}>
          {error ? message : "\u00A0"}
        </div>
      ) : null}
    </div>
  );
}

export function AdminDialogFooterMessage({
  children,
  success = false,
}: {
  children?: ReactNode;
  success?: boolean;
}) {
  return (
    <p
      aria-live="polite"
      className={cn(
        "min-h-5 flex-1 text-sm",
        success ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
      )}
    >
      {children || "\u00A0"}
    </p>
  );
}

export function AdminFormDialogFooter({
  cancelLabel,
  children,
  message,
  messageSuccess = false,
}: {
  cancelLabel: string;
  children: ReactNode;
  message?: ReactNode;
  messageSuccess?: boolean;
}) {
  return (
    <DialogFooter className="border-t border-border/70 px-4 py-3">
      <AdminDialogFooterMessage success={messageSuccess}>{message}</AdminDialogFooterMessage>
      <DialogClose asChild>
        <Button size="sm" type="button" variant="outline">
          {cancelLabel}
        </Button>
      </DialogClose>
      {children}
    </DialogFooter>
  );
}

export function hasAnyFieldError(fieldErrors?: Record<string, unknown>) {
  return Boolean(fieldErrors && Object.values(fieldErrors).some(Boolean));
}

export function resolveRequiredFieldMessage(
  fieldErrors: Record<string, unknown> | undefined,
  dictionary: Pick<AdminDictionary, "common">,
) {
  return hasAnyFieldError(fieldErrors) ? dictionary.common.requiredFields : "";
}
