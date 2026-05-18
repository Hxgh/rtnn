"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  AdminDialogSubmitButton,
  AdminFormDialogFooter,
  AdminFormField,
} from "@/src/components/admin/form-dialog";
import { AdminTableActionButton } from "@/src/components/admin/table-page";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import { Input } from "@/src/components/ui/input";
import type { AdminDictionary } from "@/src/i18n/dictionaries";
import { cn } from "@/src/lib/utils";
import {
  resetCustomerPasswordDialogAction,
  type CustomerPasswordResetFormState,
} from "@/app/(dashboard)/customers/dialog-actions";

type CustomerManagementDictionary = Pick<
  AdminDictionary,
  "account" | "common" | "customers"
>;

const initialPasswordResetState: CustomerPasswordResetFormState = {
  ok: false,
  error: null,
  errorMessage: null,
  fieldErrors: {},
};

function resolvePasswordMessage(
  state: CustomerPasswordResetFormState,
  dictionary: CustomerManagementDictionary,
) {
  if (state.errorMessage) {
    return state.errorMessage;
  }

  switch (state.error) {
    case "required":
      return dictionary.common.requiredFields;
    case "mismatch":
      return dictionary.account.passwordMismatch;
    case "too-short":
      return dictionary.account.passwordTooShort;
    case "save-failed":
      return dictionary.account.passwordSaveFailed;
    default:
      return "";
  }
}

export function ResetCustomerPasswordDialog({
  customerId,
  dictionary,
}: {
  customerId: string;
  dictionary: CustomerManagementDictionary;
}) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setFormKey((current) => current + 1);
    }
    setOpen(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <AdminTableActionButton>{dictionary.customers.resetPassword}</AdminTableActionButton>
      </DialogTrigger>
      <ResetCustomerPasswordDialogForm
        key={formKey}
        customerId={customerId}
        dictionary={dictionary}
        onSuccess={() => handleOpenChange(false)}
      />
    </Dialog>
  );
}

function ResetCustomerPasswordDialogForm({
  customerId,
  dictionary,
  onSuccess,
}: {
  customerId: string;
  dictionary: CustomerManagementDictionary;
  onSuccess: () => void;
}) {
  const [state, formAction] = useActionState(
    resetCustomerPasswordDialogAction,
    initialPasswordResetState,
  );

  useEffect(() => {
    if (state.ok) {
      onSuccess();
    }
  }, [onSuccess, state.ok]);

  const message = useMemo(
    () => resolvePasswordMessage(state, dictionary),
    [dictionary, state],
  );

  return (
    <DialogContent className="max-w-md p-0">
      <DialogHeader className="border-b border-border/70 px-4 py-4">
        <DialogTitle>{dictionary.customers.resetPassword}</DialogTitle>
        <DialogDescription>{dictionary.customers.passwordHelp}</DialogDescription>
      </DialogHeader>
      <form action={formAction} className="grid">
        <input name="id" type="hidden" value={customerId} />
        <div className="grid gap-4 px-4 py-4">
          <AdminFormField
            error={Boolean(state.fieldErrors.nextPassword)}
            htmlFor="customer-reset-password-next"
            label={dictionary.customers.nextPassword}
            message={dictionary.common.requiredFields}
          >
            <Input
              aria-invalid={Boolean(state.fieldErrors.nextPassword)}
              className={cn(
                state.fieldErrors.nextPassword &&
                  "border-destructive focus-visible:ring-destructive/20",
              )}
              id="customer-reset-password-next"
              minLength={8}
              name="nextPassword"
              type="password"
            />
          </AdminFormField>
          <AdminFormField
            error={Boolean(state.fieldErrors.confirmPassword)}
            htmlFor="customer-reset-password-confirm"
            label={dictionary.customers.confirmPassword}
            message={dictionary.common.requiredFields}
          >
            <Input
              aria-invalid={Boolean(state.fieldErrors.confirmPassword)}
              className={cn(
                state.fieldErrors.confirmPassword &&
                  "border-destructive focus-visible:ring-destructive/20",
              )}
              id="customer-reset-password-confirm"
              minLength={8}
              name="confirmPassword"
              type="password"
            />
          </AdminFormField>
        </div>
        <AdminFormDialogFooter cancelLabel={dictionary.common.cancel} message={message}>
          <AdminDialogSubmitButton
            label={dictionary.customers.resetPassword}
            loadingLabel={dictionary.common.saving}
          />
        </AdminFormDialogFooter>
      </form>
    </DialogContent>
  );
}
