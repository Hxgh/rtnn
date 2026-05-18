"use client";

import { useActionState, useEffect, useState } from "react";
import {
  AdminDialogSubmitButton,
  AdminFormDialogFooter,
  AdminFormField,
} from "@/src/components/admin/form-dialog";
import { FormSelect } from "@/src/components/admin/form-select";
import { AdminTableActionButton } from "@/src/components/admin/table-page";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import type { AdminDictionary } from "@/src/i18n/dictionaries";
import type { CustomerRecord } from "@/src/lib/api-client";
import {
  updateCustomerStatusDialogAction,
  type CustomerStatusDialogFormState,
} from "@/app/(dashboard)/customers/dialog-actions";

type CustomerManagementDictionary = Pick<
  AdminDictionary,
  "account" | "common" | "customers"
>;

type CustomerStatusRecord = Pick<CustomerRecord, "id" | "status">;

const customerStatusOptions = ["active", "inactive", "blocked"] as const;

const initialStatusState: CustomerStatusDialogFormState = {
  ok: false,
  errorMessage: null,
  fieldErrors: {},
};

function getCustomerStatusLabel(
  status: CustomerStatusRecord["status"],
  dictionary: CustomerManagementDictionary,
) {
  switch (status) {
    case "active":
      return dictionary.common.active;
    case "inactive":
      return dictionary.common.inactive;
    case "blocked":
      return dictionary.common.blocked;
  }
}

export function CustomerStatusDialog({
  customer,
  dictionary,
}: {
  customer: CustomerStatusRecord;
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
        <AdminTableActionButton>{dictionary.customers.changeStatus}</AdminTableActionButton>
      </DialogTrigger>
      <CustomerStatusDialogForm
        key={formKey}
        customer={customer}
        dictionary={dictionary}
        onSuccess={() => handleOpenChange(false)}
      />
    </Dialog>
  );
}

function CustomerStatusDialogForm({
  customer,
  dictionary,
  onSuccess,
}: {
  customer: CustomerStatusRecord;
  dictionary: CustomerManagementDictionary;
  onSuccess: () => void;
}) {
  const [state, formAction] = useActionState(
    updateCustomerStatusDialogAction,
    initialStatusState,
  );

  useEffect(() => {
    if (state.ok) {
      onSuccess();
    }
  }, [onSuccess, state.ok]);

  const message = state.errorMessage ?? (state.fieldErrors.status ? dictionary.common.requiredFields : "");

  return (
    <DialogContent className="max-w-md p-0">
      <DialogHeader className="border-b border-border/70 px-4 py-4">
        <DialogTitle>{dictionary.customers.changeStatus}</DialogTitle>
        <DialogDescription>{dictionary.customers.statusHelp}</DialogDescription>
      </DialogHeader>
      <form action={formAction} className="grid">
        <input name="id" type="hidden" value={customer.id} />
        <div className="px-4 py-4">
          <AdminFormField
            error={Boolean(state.fieldErrors.status)}
            htmlFor="edit-customer-status"
            label={dictionary.customers.status}
            message={dictionary.common.requiredFields}
          >
            <FormSelect
              ariaLabel={dictionary.customers.status}
              defaultValue={customer.status}
              id="edit-customer-status"
              name="status"
              options={customerStatusOptions.map((status) => ({
                label: getCustomerStatusLabel(status, dictionary),
                value: status,
              }))}
            />
          </AdminFormField>
        </div>
        <AdminFormDialogFooter cancelLabel={dictionary.common.cancel} message={message}>
          <AdminDialogSubmitButton
            label={dictionary.common.update}
            loadingLabel={dictionary.common.saving}
          />
        </AdminFormDialogFooter>
      </form>
    </DialogContent>
  );
}
