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
import { SelectionCard, SelectionCards } from "@/src/components/admin/selection-cards";
import { EmptyBlock } from "@/src/components/admin/state-block";
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
import { Textarea } from "@/src/components/ui/textarea";
import type { AdminDictionary } from "@/src/i18n/dictionaries";
import type { PermissionRecord, RoleRecord } from "@/src/lib/api-client";
import { cn } from "@/src/lib/utils";
import {
  createRoleDialogAction,
  updateRoleDialogAction,
  type RoleDialogFormState,
} from "@/app/(dashboard)/roles/dialog-actions";

type RoleDialogDictionary = Pick<AdminDictionary, "common" | "roles" | "states">;

type RolePermissionOption = Pick<PermissionRecord, "description" | "id" | "key" | "name">;

const initialDialogState: RoleDialogFormState = {
  ok: false,
  errorMessage: null,
  fieldErrors: {},
};

function resolveMessage(
  state: RoleDialogFormState,
  dictionary: Pick<AdminDictionary, "common">,
) {
  if (state.errorMessage) {
    return state.errorMessage;
  }

  return resolveRequiredFieldMessage(state.fieldErrors, dictionary);
}

export function CreateRoleDialog({
  dictionary,
  permissions,
}: {
  dictionary: RoleDialogDictionary;
  permissions: RolePermissionOption[];
}) {
  return (
    <RoleDialog
      dictionary={dictionary}
      permissions={permissions}
      title={dictionary.roles.newRole}
      trigger={<Button size="sm">{dictionary.roles.newRole}</Button>}
      variant="create"
    />
  );
}

export function EditRoleDialog({
  dictionary,
  permissions,
  role,
}: {
  dictionary: RoleDialogDictionary;
  permissions: RolePermissionOption[];
  role: Pick<RoleRecord, "description" | "id" | "name" | "permissions">;
}) {
  return (
    <RoleDialog
      dictionary={dictionary}
      permissions={permissions}
      role={role}
      title={dictionary.roles.editRole}
      trigger={
        <AdminTableActionButton>
          {dictionary.common.update}
        </AdminTableActionButton>
      }
      variant="edit"
    />
  );
}

function RoleDialog({
  dictionary,
  permissions,
  role,
  title,
  trigger,
  variant,
}: {
  dictionary: RoleDialogDictionary;
  permissions: RolePermissionOption[];
  role?: Pick<RoleRecord, "description" | "id" | "name" | "permissions">;
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
      <RoleDialogForm
        key={formKey}
        dictionary={dictionary}
        onSuccess={handleSuccess}
        permissions={permissions}
        role={role}
        title={title}
        variant={variant}
      />
    </Dialog>
  );
}

function RoleDialogForm({
  dictionary,
  onSuccess,
  permissions,
  role,
  title,
  variant,
}: {
  dictionary: RoleDialogDictionary;
  onSuccess: () => void;
  permissions: RolePermissionOption[];
  role?: Pick<RoleRecord, "description" | "id" | "name" | "permissions">;
  title: string;
  variant: "create" | "edit";
}) {
  const action = variant === "create" ? createRoleDialogAction : updateRoleDialogAction;
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
    <DialogContent className="max-h-[85vh] overflow-hidden p-0 sm:max-w-3xl">
      <DialogHeader className="border-b border-border/70 px-4 py-4">
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <form action={formAction} className="grid overflow-hidden">
        {variant === "edit" && role ? <input name="id" type="hidden" value={role.id} /> : null}
        <div className="grid gap-4 overflow-y-auto px-4 py-4">
          <div className="grid gap-3">
            <AdminFormField
              error={Boolean(state.fieldErrors.name)}
              htmlFor={variant === "create" ? "create-role-name" : "edit-role-name"}
              label={dictionary.roles.roleName}
              message={dictionary.common.requiredFields}
            >
              <Input
                aria-invalid={Boolean(state.fieldErrors.name)}
                className={cn(
                  state.fieldErrors.name && "border-destructive focus-visible:ring-destructive/20",
                )}
                defaultValue={role?.name ?? ""}
                id={variant === "create" ? "create-role-name" : "edit-role-name"}
                name="name"
                required
              />
            </AdminFormField>
            <div className="grid gap-2">
              <Label htmlFor={variant === "create" ? "create-role-description" : "edit-role-description"}>
                {dictionary.roles.description}
              </Label>
              <Textarea
                defaultValue={role?.description ?? ""}
                id={variant === "create" ? "create-role-description" : "edit-role-description"}
                name="description"
                rows={3}
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto pr-1">
            <SelectionCards legend={dictionary.roles.permissions}>
              {permissions.length > 0 ? (
                permissions.map((permission) => (
                  <SelectionCard
                    compact
                    key={permission.id}
                    defaultChecked={Boolean(role?.permissions?.includes(permission.key))}
                    description={permission.key}
                    label={permission.name}
                    name="permissionKeys"
                    value={permission.key}
                  />
                ))
              ) : (
                <EmptyBlock text={dictionary.states.empty} />
              )}
            </SelectionCards>
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
