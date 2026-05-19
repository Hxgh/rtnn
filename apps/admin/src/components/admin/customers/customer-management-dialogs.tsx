"use client";

import {
  forwardRef,
  useActionState,
  useEffect,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
} from "react";
import {
  AdminDialogSubmitButton,
  AdminFormDialogFooter,
  AdminFormField,
  resolveRequiredFieldMessage,
} from "@/src/components/admin/form-dialog";
import { EmptyBlock } from "@/src/components/admin/state-block";
export { CustomerStatusDialog } from "@/src/components/admin/customers/customer-status-dialog";
export { ResetCustomerPasswordDialog } from "@/src/components/admin/customers/reset-customer-password-dialog";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import { Input } from "@/src/components/ui/input";
import { Textarea } from "@/src/components/ui/textarea";
import type {
  CustomerGroupRecord,
  CustomerTagRecord,
} from "@/src/lib/api-client";
import { cn } from "@/src/lib/utils";
import type { AdminDictionary } from "@/src/i18n/dictionaries";
import {
  createCustomerGroupDialogAction,
  createCustomerTagDialogAction,
  updateCustomerGroupDialogAction,
  updateCustomerTagDialogAction,
  type CustomerLookupDialogFormState,
} from "@/app/(dashboard)/customers/dialog-actions";

type CustomerManagementDictionary = Pick<
  AdminDictionary,
  "account" | "common" | "customers"
>;

type CustomerGroupCatalogRecord = Pick<
  CustomerGroupRecord,
  "customerCount" | "description" | "id" | "name"
>;
type CustomerTagCatalogRecord = Pick<
  CustomerTagRecord,
  "color" | "customerCount" | "id" | "name"
>;

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

function resolveLookupMessage(
  state: CustomerLookupDialogFormState,
  dictionary: CustomerManagementDictionary,
) {
  if (state.errorMessage) {
    return state.errorMessage;
  }

  return resolveRequiredFieldMessage(state.fieldErrors, dictionary);
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
          <DialogDescription className="sr-only">{dictionary.customers.groups}</DialogDescription>
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
        <AdminFormField
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
        </AdminFormField>
        <AdminFormField
          htmlFor="customer-group-description"
          label={dictionary.common.description}
          reserveMessage={false}
        >
          <Textarea
            defaultValue={group?.description ?? ""}
            id="customer-group-description"
            name="description"
            rows={4}
          />
        </AdminFormField>
      </div>
      <AdminFormDialogFooter cancelLabel={dictionary.common.cancel} message={message}>
        <AdminDialogSubmitButton
          label={group ? dictionary.common.update : dictionary.common.create}
          loadingLabel={dictionary.common.saving}
        />
      </AdminFormDialogFooter>
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
          <DialogDescription className="sr-only">{dictionary.customers.tags}</DialogDescription>
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
        <AdminFormField
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
        </AdminFormField>
        <AdminFormField
          htmlFor="customer-tag-color"
          label={dictionary.common.color}
          reserveMessage={false}
        >
          <Input
            defaultValue={tag?.color ?? ""}
            id="customer-tag-color"
            name="color"
            placeholder="#111111"
          />
        </AdminFormField>
      </div>
      <AdminFormDialogFooter cancelLabel={dictionary.common.cancel} message={message}>
        <AdminDialogSubmitButton
          label={tag ? dictionary.common.update : dictionary.common.create}
          loadingLabel={dictionary.common.saving}
        />
      </AdminFormDialogFooter>
    </form>
  );
}
