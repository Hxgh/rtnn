"use client";

import {
  forwardRef,
  useActionState,
  useEffect,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";
import { EmptyBlock } from "@/src/components/admin/state-block";
import { AdminTableActionButton } from "@/src/components/admin/table-page";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Textarea } from "@/src/components/ui/textarea";
import { FormSelect } from "@/src/components/admin/form-select";
import type {
  CustomerGroupRecord,
  CustomerRecord,
  CustomerTagRecord,
} from "@/src/lib/api-client";
import { cn } from "@/src/lib/utils";
import type { AdminDictionary } from "@/src/i18n/dictionaries";
import {
  createCustomerGroupDialogAction,
  createCustomerTagDialogAction,
  resetCustomerPasswordDialogAction,
  updateCustomerGroupDialogAction,
  updateCustomerStatusDialogAction,
  updateCustomerTagDialogAction,
  type CustomerLookupDialogFormState,
  type CustomerPasswordResetFormState,
  type CustomerStatusDialogFormState,
} from "@/app/(dashboard)/customers/dialog-actions";

type CustomerManagementDictionary = Pick<
  AdminDictionary,
  "account" | "common" | "customers"
>;

type CustomerStatusRecord = Pick<CustomerRecord, "id" | "status">;
type CustomerGroupCatalogRecord = Pick<
  CustomerGroupRecord,
  "customerCount" | "description" | "id" | "name"
>;
type CustomerTagCatalogRecord = Pick<
  CustomerTagRecord,
  "color" | "customerCount" | "id" | "name"
>;

const customerStatusOptions = ["active", "inactive", "blocked"] as const;

const initialStatusState: CustomerStatusDialogFormState = {
  ok: false,
  errorMessage: null,
  fieldErrors: {},
};

const initialPasswordResetState: CustomerPasswordResetFormState = {
  ok: false,
  error: null,
  errorMessage: null,
  fieldErrors: {},
};

const initialLookupState: CustomerLookupDialogFormState = {
  ok: false,
  errorMessage: null,
  fieldErrors: {},
};

const ActionTriggerButton = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof Button>
>(({ children, className, size = "sm", ...props }, ref) => {
  return (
    <Button
      ref={ref}
      className={cn("h-7 px-2", className)}
      size={size}
      {...props}
    >
      {children}
    </Button>
  );
});
ActionTriggerButton.displayName = "ActionTriggerButton";

function SubmitButton({
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

function FormField({
  children,
  error,
  htmlFor,
  label,
  message,
}: {
  children: ReactNode;
  error: boolean;
  htmlFor: string;
  label: string;
  message: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      <div className={cn("min-h-3 text-[11px] text-destructive", !error && "opacity-0")}>
        {error ? message : "\u00A0"}
      </div>
    </div>
  );
}

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

function resolveLookupMessage(
  state: CustomerLookupDialogFormState,
  dictionary: CustomerManagementDictionary,
) {
  if (state.errorMessage) {
    return state.errorMessage;
  }

  if (state.fieldErrors.name) {
    return dictionary.common.requiredFields;
  }

  return "";
}

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
          <FormField
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
          </FormField>
        </div>
        <DialogFooter className="border-t border-border/70 px-4 py-3">
          <p aria-live="polite" className="min-h-5 flex-1 text-sm text-destructive">
            {message || "\u00A0"}
          </p>
          <DialogClose asChild>
            <Button size="sm" type="button" variant="outline">
              {dictionary.common.cancel}
            </Button>
          </DialogClose>
          <SubmitButton
            label={dictionary.common.update}
            loadingLabel={dictionary.common.saving}
          />
        </DialogFooter>
      </form>
    </DialogContent>
  );
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
          <FormField
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
          </FormField>
          <FormField
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
          </FormField>
        </div>
        <DialogFooter className="border-t border-border/70 px-4 py-3">
          <p aria-live="polite" className="min-h-5 flex-1 text-sm text-destructive">
            {message || "\u00A0"}
          </p>
          <DialogClose asChild>
            <Button size="sm" type="button" variant="outline">
              {dictionary.common.cancel}
            </Button>
          </DialogClose>
          <SubmitButton
            label={dictionary.customers.resetPassword}
            loadingLabel={dictionary.common.saving}
          />
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

export function ManageCustomerGroupsDialog({
  canManage,
  dictionary,
  groups,
}: {
  canManage: boolean;
  dictionary: CustomerManagementDictionary;
  groups: CustomerGroupCatalogRecord[];
}) {
  const [open, setOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<CustomerGroupCatalogRecord | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedGroup(null);
    }
    setOpen(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <ActionTriggerButton variant="outline">
          {dictionary.customers.manageGroups}
        </ActionTriggerButton>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="border-b border-border/70 px-4 py-4">
          <DialogTitle>{dictionary.customers.groups}</DialogTitle>
        </DialogHeader>
        <div className={cn("grid min-h-0", canManage && "md:grid-cols-[minmax(0,1fr)_320px]")}>
          <div className={cn("min-h-0 overflow-y-auto", canManage && "border-b border-border/70 md:border-r md:border-b-0")}>
            <div className="grid gap-3 p-4">
              {groups.length === 0 ? (
                <EmptyBlock text={dictionary.customers.groupsEmpty} />
              ) : (
                groups.map((group) => {
                  const count = group.customerCount ?? 0;
                  const content = (
                    <>
                      <div className="space-y-1">
                        <div className="font-medium text-foreground">{group.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {group.description || "-"}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {dictionary.customers.linkedCustomers}: {count}
                      </div>
                    </>
                  );

                  if (!canManage) {
                    return (
                      <div
                        key={group.id}
                        className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-card px-4 py-3"
                      >
                        {content}
                      </div>
                    );
                  }

                  return (
                    <button
                      key={group.id}
                      className={cn(
                        "flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 text-left shadow-sm transition-colors hover:bg-accent/20",
                        selectedGroup?.id === group.id && "border-primary bg-primary/[0.06]",
                      )}
                      type="button"
                      onClick={() => setSelectedGroup(group)}
                    >
                      {content}
                    </button>
                  );
                })
              )}
            </div>
          </div>
          {canManage ? (
            <CustomerGroupFormPane
              key={selectedGroup?.id ?? "create-group"}
              dictionary={dictionary}
              group={selectedGroup}
              onCreateNew={() => setSelectedGroup(null)}
              onSuccess={() => handleOpenChange(false)}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CustomerGroupFormPane({
  dictionary,
  group,
  onCreateNew,
  onSuccess,
}: {
  dictionary: CustomerManagementDictionary;
  group: CustomerGroupCatalogRecord | null;
  onCreateNew: () => void;
  onSuccess: () => void;
}) {
  const action = group
    ? updateCustomerGroupDialogAction
    : createCustomerGroupDialogAction;
  const [state, formAction] = useActionState(action, initialLookupState);

  useEffect(() => {
    if (state.ok) {
      onSuccess();
    }
  }, [onSuccess, state.ok]);

  const message = useMemo(
    () => resolveLookupMessage(state, dictionary),
    [dictionary, state],
  );

  return (
    <form
      key={group?.id ?? "create-group"}
      action={formAction}
      className="grid min-h-0 grid-rows-[auto_1fr_auto]"
    >
      {group ? <input name="id" type="hidden" value={group.id} /> : null}
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
        <div className="text-sm font-medium text-foreground">
          {group ? dictionary.customers.editGroup : dictionary.customers.newGroup}
        </div>
        {group ? (
          <Button size="sm" type="button" variant="ghost" onClick={onCreateNew}>
            {dictionary.customers.newGroup}
          </Button>
        ) : null}
      </div>
      <div className="grid gap-4 overflow-y-auto px-4 py-4">
        <FormField
          error={Boolean(state.fieldErrors.name)}
          htmlFor="customer-group-name"
          label={dictionary.common.name}
          message={dictionary.common.requiredFields}
        >
          <Input
            aria-invalid={Boolean(state.fieldErrors.name)}
            className={cn(
              state.fieldErrors.name &&
                "border-destructive focus-visible:ring-destructive/20",
            )}
            defaultValue={group?.name ?? ""}
            id="customer-group-name"
            name="name"
          />
        </FormField>
        <div className="grid gap-2">
          <Label htmlFor="customer-group-description">{dictionary.common.description}</Label>
          <Textarea
            defaultValue={group?.description ?? ""}
            id="customer-group-description"
            name="description"
            rows={4}
          />
        </div>
      </div>
      <DialogFooter className="border-t border-border/70 px-4 py-3">
        <p aria-live="polite" className="min-h-5 flex-1 text-sm text-destructive">
          {message || "\u00A0"}
        </p>
        <DialogClose asChild>
          <Button size="sm" type="button" variant="outline">
            {dictionary.common.cancel}
          </Button>
        </DialogClose>
        <SubmitButton
          label={group ? dictionary.common.update : dictionary.common.create}
          loadingLabel={dictionary.common.saving}
        />
      </DialogFooter>
    </form>
  );
}

export function ManageCustomerTagsDialog({
  canManage,
  dictionary,
  tags,
}: {
  canManage: boolean;
  dictionary: CustomerManagementDictionary;
  tags: CustomerTagCatalogRecord[];
}) {
  const [open, setOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<CustomerTagCatalogRecord | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedTag(null);
    }
    setOpen(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <ActionTriggerButton variant="outline">
          {dictionary.customers.manageTags}
        </ActionTriggerButton>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="border-b border-border/70 px-4 py-4">
          <DialogTitle>{dictionary.customers.tags}</DialogTitle>
        </DialogHeader>
        <div className={cn("grid min-h-0", canManage && "md:grid-cols-[minmax(0,1fr)_320px]")}>
          <div className={cn("min-h-0 overflow-y-auto", canManage && "border-b border-border/70 md:border-r md:border-b-0")}>
            <div className="grid gap-3 p-4">
              {tags.length === 0 ? (
                <EmptyBlock text={dictionary.customers.tagsEmpty} />
              ) : (
                tags.map((tag) => {
                  const count = tag.customerCount ?? 0;
                  const content = (
                    <>
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="size-3 rounded-full border border-border/70"
                          style={{ backgroundColor: tag.color || "transparent" }}
                        />
                        <div className="min-w-0">
                          <div className="truncate font-medium text-foreground">{tag.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {tag.color || "-"}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {dictionary.customers.linkedCustomers}: {count}
                      </div>
                    </>
                  );

                  if (!canManage) {
                    return (
                      <div
                        key={tag.id}
                        className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-card px-4 py-3"
                      >
                        {content}
                      </div>
                    );
                  }

                  return (
                    <button
                      key={tag.id}
                      className={cn(
                        "flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 text-left shadow-sm transition-colors hover:bg-accent/20",
                        selectedTag?.id === tag.id && "border-primary bg-primary/[0.06]",
                      )}
                      type="button"
                      onClick={() => setSelectedTag(tag)}
                    >
                      {content}
                    </button>
                  );
                })
              )}
            </div>
          </div>
          {canManage ? (
            <CustomerTagFormPane
              key={selectedTag?.id ?? "create-tag"}
              dictionary={dictionary}
              onCreateNew={() => setSelectedTag(null)}
              onSuccess={() => handleOpenChange(false)}
              tag={selectedTag}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CustomerTagFormPane({
  dictionary,
  onCreateNew,
  onSuccess,
  tag,
}: {
  dictionary: CustomerManagementDictionary;
  onCreateNew: () => void;
  onSuccess: () => void;
  tag: CustomerTagCatalogRecord | null;
}) {
  const action = tag
    ? updateCustomerTagDialogAction
    : createCustomerTagDialogAction;
  const [state, formAction] = useActionState(action, initialLookupState);

  useEffect(() => {
    if (state.ok) {
      onSuccess();
    }
  }, [onSuccess, state.ok]);

  const message = useMemo(
    () => resolveLookupMessage(state, dictionary),
    [dictionary, state],
  );

  return (
    <form
      key={tag?.id ?? "create-tag"}
      action={formAction}
      className="grid min-h-0 grid-rows-[auto_1fr_auto]"
    >
      {tag ? <input name="id" type="hidden" value={tag.id} /> : null}
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
        <div className="text-sm font-medium text-foreground">
          {tag ? dictionary.customers.editTag : dictionary.customers.newTag}
        </div>
        {tag ? (
          <Button size="sm" type="button" variant="ghost" onClick={onCreateNew}>
            {dictionary.customers.newTag}
          </Button>
        ) : null}
      </div>
      <div className="grid gap-4 overflow-y-auto px-4 py-4">
        <FormField
          error={Boolean(state.fieldErrors.name)}
          htmlFor="customer-tag-name"
          label={dictionary.common.name}
          message={dictionary.common.requiredFields}
        >
          <Input
            aria-invalid={Boolean(state.fieldErrors.name)}
            className={cn(
              state.fieldErrors.name &&
                "border-destructive focus-visible:ring-destructive/20",
            )}
            defaultValue={tag?.name ?? ""}
            id="customer-tag-name"
            name="name"
          />
        </FormField>
        <div className="grid gap-2">
          <Label htmlFor="customer-tag-color">{dictionary.common.color}</Label>
          <Input
            defaultValue={tag?.color ?? ""}
            id="customer-tag-color"
            name="color"
            placeholder="#111111"
          />
        </div>
      </div>
      <DialogFooter className="border-t border-border/70 px-4 py-3">
        <p aria-live="polite" className="min-h-5 flex-1 text-sm text-destructive">
          {message || "\u00A0"}
        </p>
        <DialogClose asChild>
          <Button size="sm" type="button" variant="outline">
            {dictionary.common.cancel}
          </Button>
        </DialogClose>
        <SubmitButton
          label={tag ? dictionary.common.update : dictionary.common.create}
          loadingLabel={dictionary.common.saving}
        />
      </DialogFooter>
    </form>
  );
}
