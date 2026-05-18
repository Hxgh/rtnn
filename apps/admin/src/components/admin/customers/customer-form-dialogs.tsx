"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
} from "react";
import {
  AdminDialogSubmitButton,
  AdminFormDialogFooter,
  AdminFormField,
  resolveRequiredFieldMessage,
} from "@/src/components/admin/form-dialog";
import { AdminTableActionButton } from "@/src/components/admin/table-page";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import type { AdminDictionary } from "@/src/i18n/dictionaries";
import type { CustomerRecord } from "@/src/lib/api-client";
import { cn } from "@/src/lib/utils";
import {
  createCustomerDialogAction,
  updateCustomerDialogAction,
  type CustomerDialogFormState,
} from "@/app/(dashboard)/customers/dialog-actions";

type CustomerDialogDictionary = Pick<AdminDictionary, "common" | "customers">;

const initialDialogState: CustomerDialogFormState = {
  ok: false,
  errorMessage: null,
  fieldErrors: {},
};

function resolveMessage(
  state: CustomerDialogFormState,
  dictionary: Pick<AdminDictionary, "common">,
) {
  if (state.errorMessage) {
    return state.errorMessage;
  }

  return resolveRequiredFieldMessage(state.fieldErrors, dictionary);
}

export function CreateCustomerDialog({
  dictionary,
}: {
  dictionary: CustomerDialogDictionary;
}) {
  return (
    <CustomerDialog
      dictionary={dictionary}
      title={dictionary.customers.newCustomer}
      trigger={<Button size="sm">{dictionary.customers.newCustomer}</Button>}
      variant="create"
    />
  );
}

export function EditCustomerDialog({
  dictionary,
  customer,
}: {
  dictionary: CustomerDialogDictionary;
  customer: Pick<CustomerRecord, "email" | "id" | "name" | "phone">;
}) {
  return (
    <CustomerDialog
      customer={customer}
      dictionary={dictionary}
      title={dictionary.customers.editCustomer}
      trigger={
        <AdminTableActionButton>
          {dictionary.common.update}
        </AdminTableActionButton>
      }
      variant="edit"
    />
  );
}

function CustomerDialog({
  customer,
  dictionary,
  title,
  trigger,
  variant,
}: {
  customer?: Pick<CustomerRecord, "email" | "id" | "name" | "phone">;
  dictionary: CustomerDialogDictionary;
  title: string;
  trigger: ReactElement;
  variant: "create" | "edit";
}) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      setFormKey((current) => current + 1);
    }
    setOpen(nextOpen);
  }, []);

  const handleSuccess = useCallback(() => {
    handleOpenChange(false);
  }, [handleOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <CustomerDialogForm
        key={formKey}
        customer={customer}
        dictionary={dictionary}
        onSuccess={handleSuccess}
        title={title}
        variant={variant}
      />
    </Dialog>
  );
}

function CustomerDialogForm({
  customer,
  dictionary,
  onSuccess,
  title,
  variant,
}: {
  customer?: Pick<CustomerRecord, "email" | "id" | "name" | "phone">;
  dictionary: CustomerDialogDictionary;
  onSuccess: () => void;
  title: string;
  variant: "create" | "edit";
}) {
  const action =
    variant === "create" ? createCustomerDialogAction : updateCustomerDialogAction;
  const [state, formAction] = useActionState(action, initialDialogState);

  useEffect(() => {
    if (state.ok) {
      onSuccess();
    }
  }, [onSuccess, state.ok]);

  const message = useMemo(
    () => resolveMessage(state, dictionary),
    [dictionary, state],
  );

  return (
    <DialogContent className="max-h-[85vh] overflow-hidden p-0 sm:max-w-lg">
      <DialogHeader className="border-b border-border/70 px-4 py-4">
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <form action={formAction} className="grid overflow-hidden">
        {variant === "edit" && customer ? (
          <input name="id" type="hidden" value={customer.id} />
        ) : null}
        <div className="grid gap-4 overflow-y-auto px-4 py-4">
          <div className="grid gap-3 md:grid-cols-2">
            <AdminFormField
              error={Boolean(state.fieldErrors.name)}
              htmlFor={variant === "create" ? "create-customer-name" : "edit-customer-name"}
              label={dictionary.customers.name}
              message={dictionary.common.requiredFields}
            >
              <Input
                aria-invalid={Boolean(state.fieldErrors.name)}
                className={cn(
                  state.fieldErrors.name &&
                    "border-destructive focus-visible:ring-destructive/20",
                )}
                defaultValue={customer?.name ?? ""}
                id={variant === "create" ? "create-customer-name" : "edit-customer-name"}
                name="name"
                required
              />
            </AdminFormField>

            <div className="grid gap-2">
              <Label htmlFor={variant === "create" ? "create-customer-phone" : "edit-customer-phone"}>
                {dictionary.customers.phone}
              </Label>
              <Input
                defaultValue={customer?.phone ?? ""}
                id={variant === "create" ? "create-customer-phone" : "edit-customer-phone"}
                name="phone"
              />
            </div>

            {variant === "create" ? (
              <>
                <AdminFormField
                  error={Boolean(state.fieldErrors.email)}
                  htmlFor="create-customer-email"
                  label={dictionary.customers.email}
                  message={dictionary.common.requiredFields}
                >
                  <Input
                    aria-invalid={Boolean(state.fieldErrors.email)}
                    className={cn(
                      state.fieldErrors.email &&
                        "border-destructive focus-visible:ring-destructive/20",
                    )}
                    id="create-customer-email"
                    name="email"
                    type="email"
                    required
                  />
                </AdminFormField>
                <AdminFormField
                  error={Boolean(state.fieldErrors.password)}
                  htmlFor="create-customer-password"
                  label={dictionary.customers.password}
                  message={dictionary.common.requiredFields}
                >
                  <Input
                    aria-invalid={Boolean(state.fieldErrors.password)}
                    className={cn(
                      state.fieldErrors.password &&
                        "border-destructive focus-visible:ring-destructive/20",
                    )}
                    id="create-customer-password"
                    name="password"
                    type="password"
                    required
                  />
                </AdminFormField>
              </>
            ) : (
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="edit-customer-email">{dictionary.customers.email}</Label>
                <Input
                  defaultValue={customer?.email ?? ""}
                  disabled
                  id="edit-customer-email"
                  readOnly
                />
              </div>
            )}
          </div>
        </div>
        <AdminFormDialogFooter cancelLabel={dictionary.common.cancel} message={message}>
          <AdminDialogSubmitButton
            label={variant === "create" ? dictionary.common.create : dictionary.common.update}
            loadingLabel={dictionary.common.saving}
          />
        </AdminFormDialogFooter>
      </form>
    </DialogContent>
  );
}
