"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";
import { FormSelect } from "@/src/components/admin/form-select";
import { SelectionCard, SelectionCards } from "@/src/components/admin/selection-cards";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import type { AdminDictionary } from "@/src/i18n/dictionaries";
import type { AdminUserRecord, RoleRecord } from "@/src/lib/api-client";
import { cn } from "@/src/lib/utils";
import {
  createUserDialogAction,
  updateUserDialogAction,
  type UserDialogFormState,
} from "@/app/(dashboard)/users/dialog-actions";

type UserDialogDictionary = Pick<AdminDictionary, "common" | "roles" | "users">;

type UserRoleOption = Pick<RoleRecord, "description" | "id" | "name">;

const initialDialogState: UserDialogFormState = {
  ok: false,
  errorMessage: null,
  fieldErrors: {},
};

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

function resolveMessage(
  state: UserDialogFormState,
  dictionary: Pick<AdminDictionary, "common">,
) {
  if (state.errorMessage) {
    return state.errorMessage;
  }

  if (Object.values(state.fieldErrors).some(Boolean)) {
    return dictionary.common.requiredFields;
  }

  return "";
}

export function CreateUserDialog({
  dictionary,
  roles,
}: {
  dictionary: UserDialogDictionary;
  roles: UserRoleOption[];
}) {
  return (
    <UserDialog
      dictionary={dictionary}
      roles={roles}
      title={dictionary.users.newUser}
      trigger={<Button size="sm">{dictionary.users.newUser}</Button>}
      variant="create"
    />
  );
}

export function EditUserDialog({
  dictionary,
  roles,
  user,
}: {
  dictionary: UserDialogDictionary;
  roles: UserRoleOption[];
  user: Pick<AdminUserRecord, "email" | "id" | "name" | "roleIds" | "status">;
}) {
  return (
    <UserDialog
      dictionary={dictionary}
      roles={roles}
      title={dictionary.users.editUser}
      trigger={
        <Button className="h-auto px-2 py-1" size="sm" variant="ghost">
          {dictionary.common.update}
        </Button>
      }
      user={user}
      variant="edit"
    />
  );
}

function UserDialog({
  dictionary,
  roles,
  title,
  trigger,
  user,
  variant,
}: {
  dictionary: UserDialogDictionary;
  roles: UserRoleOption[];
  title: string;
  trigger: ReactElement;
  user?: Pick<AdminUserRecord, "email" | "id" | "name" | "roleIds" | "status">;
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
      <UserDialogForm
        key={formKey}
        dictionary={dictionary}
        onSuccess={handleSuccess}
        roles={roles}
        title={title}
        user={user}
        variant={variant}
      />
    </Dialog>
  );
}

function UserDialogForm({
  dictionary,
  onSuccess,
  roles,
  title,
  user,
  variant,
}: {
  dictionary: UserDialogDictionary;
  onSuccess: () => void;
  roles: UserRoleOption[];
  title: string;
  user?: Pick<AdminUserRecord, "email" | "id" | "name" | "roleIds" | "status">;
  variant: "create" | "edit";
}) {
  const action = variant === "create" ? createUserDialogAction : updateUserDialogAction;
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
    <DialogContent className="max-h-[85vh] overflow-hidden p-0 sm:max-w-2xl">
      <DialogHeader className="border-b border-border/70 px-4 py-4">
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <form action={formAction} className="grid overflow-hidden">
        {variant === "edit" && user ? <input name="id" type="hidden" value={user.id} /> : null}
        <div className="grid gap-4 overflow-y-auto px-4 py-4">
          <div
            className={cn(
              "grid gap-3",
              variant === "create" ? "md:grid-cols-2" : "md:grid-cols-[minmax(0,1fr)_200px]",
            )}
          >
            <FormField
              dictionary={dictionary}
              error={Boolean(state.fieldErrors.name)}
              htmlFor={variant === "create" ? "create-user-name" : "edit-user-name"}
              label={dictionary.users.name}
            >
              <Input
                aria-invalid={Boolean(state.fieldErrors.name)}
                className={cn(
                  state.fieldErrors.name && "border-destructive focus-visible:ring-destructive/20",
                )}
                defaultValue={user?.name ?? ""}
                id={variant === "create" ? "create-user-name" : "edit-user-name"}
                name="name"
                required
              />
            </FormField>

            {variant === "create" ? (
              <>
                <FormField
                  dictionary={dictionary}
                  error={Boolean(state.fieldErrors.email)}
                  htmlFor="create-user-email"
                  label={dictionary.users.email}
                >
                  <Input
                    aria-invalid={Boolean(state.fieldErrors.email)}
                    className={cn(
                      state.fieldErrors.email &&
                        "border-destructive focus-visible:ring-destructive/20",
                    )}
                    defaultValue={user?.email ?? ""}
                    id="create-user-email"
                    name="email"
                    type="email"
                    required
                  />
                </FormField>
                <FormField
                  dictionary={dictionary}
                  error={Boolean(state.fieldErrors.password)}
                  htmlFor="create-user-password"
                  label={dictionary.users.password}
                >
                  <Input
                    aria-invalid={Boolean(state.fieldErrors.password)}
                    className={cn(
                      state.fieldErrors.password &&
                        "border-destructive focus-visible:ring-destructive/20",
                    )}
                    id="create-user-password"
                    name="password"
                    type="password"
                    required
                  />
                </FormField>
              </>
            ) : (
              <FormField
                dictionary={dictionary}
                error={false}
                htmlFor="edit-user-status"
                label={dictionary.users.status}
              >
                <FormSelect
                  ariaLabel={dictionary.users.status}
                  defaultValue={user?.status ?? "active"}
                  id="edit-user-status"
                  name="status"
                  options={[
                    {
                      label: dictionary.common.active,
                      value: "active",
                    },
                    {
                      label: dictionary.common.disabled,
                      value: "disabled",
                    },
                  ]}
                />
              </FormField>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto pr-1">
            <SelectionCards legend={dictionary.users.roles}>
              {roles.length > 0 ? (
                roles.map((role) => (
                  <SelectionCard
                    compact
                    key={role.id}
                    defaultChecked={Boolean(user?.roleIds?.includes(role.id))}
                    description={role.description || null}
                    label={role.name}
                    name="roleIds"
                    value={role.id}
                  />
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
                  {dictionary.roles.empty}
                </div>
              )}
            </SelectionCards>
          </div>
        </div>
        <DialogFooter className="border-t border-border/70 px-4 py-3">
          <p
            aria-live="polite"
            className="min-h-5 flex-1 text-sm text-destructive"
          >
            {message || "\u00A0"}
          </p>
          <DialogClose asChild>
            <Button size="sm" type="button" variant="outline">
              {dictionary.common.cancel}
            </Button>
          </DialogClose>
          <SubmitButton
            label={variant === "create" ? dictionary.common.create : dictionary.common.update}
            loadingLabel={dictionary.common.saving}
          />
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function FormField({
  children,
  dictionary,
  error,
  htmlFor,
  label,
}: {
  children: ReactNode;
  dictionary: Pick<AdminDictionary, "common">;
  error: boolean;
  htmlFor: string;
  label: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      <div className={cn("min-h-3 text-[11px] text-destructive", !error && "opacity-0")}>
        {error ? dictionary.common.requiredFields : "\u00A0"}
      </div>
    </div>
  );
}
