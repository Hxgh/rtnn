"use client";

import { useActionState, useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  AdminDialogFooterMessage,
  AdminDialogSubmitButton,
} from "@/src/components/admin/form-dialog";
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
import type { AdminDictionary } from "@/src/i18n/dictionaries";
import { cn } from "@/src/lib/utils";
import {
  changePasswordAction,
  type ChangePasswordFormState,
} from "@/app/(dashboard)/account/actions";

const initialDialogState: ChangePasswordFormState = {
  ok: false,
  error: null,
  fieldErrors: {},
};

function resolveMessage(
  state: ChangePasswordFormState,
  dictionary: Pick<AdminDictionary, "account">,
) {
  if (state.ok) {
    return dictionary.account.passwordUpdated;
  }
  switch (state.error) {
    case "required":
      return dictionary.account.passwordRequired;
    case "mismatch":
      return dictionary.account.passwordMismatch;
    case "same-as-current":
      return dictionary.account.passwordSameAsCurrent;
    case "too-short":
      return dictionary.account.passwordTooShort;
    case "current-invalid":
      return dictionary.account.passwordCurrentInvalid;
    case "save-failed":
      return dictionary.account.passwordSaveFailed;
    default:
      return "";
  }
}

export function ChangePasswordDialog({
  dictionary,
  open: controlledOpen,
  onOpenChange,
  trigger,
}: {
  dictionary: Pick<AdminDictionary, "account" | "common">;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactElement;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = useCallback((nextOpen: boolean) => {
    if (controlledOpen === undefined) {
      setUncontrolledOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  }, [controlledOpen, onOpenChange]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (!nextOpen) {
      setFormKey((value) => value + 1);
    }
    setOpen(nextOpen);
  }, [setOpen]);

  const handleSuccess = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      handleOpenChange(false);
    }, 700);
  }, [handleOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <ChangePasswordDialogForm
        key={formKey}
        dictionary={dictionary}
        onSuccess={handleSuccess}
      />
    </Dialog>
  );
}

function ChangePasswordDialogForm({
  dictionary,
  onSuccess,
}: {
  dictionary: Pick<AdminDictionary, "account" | "common">;
  onSuccess: () => void;
}) {
  const [state, formAction] = useActionState(changePasswordAction, initialDialogState);
  const fieldErrors = state.fieldErrors ?? {};
  const [visibleField, setVisibleField] = useState<
    "currentPassword" | "nextPassword" | "confirmPassword" | null
  >(null);

  useEffect(() => {
    if (state.ok) {
      onSuccess();
    }
  }, [onSuccess, state.ok]);

  const message = resolveMessage(state, dictionary);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{dictionary.account.changePassword}</DialogTitle>
        <DialogDescription className="sr-only">
          {dictionary.account.passwordSessionNotice}
        </DialogDescription>
      </DialogHeader>
      <form action={formAction} className="grid gap-4">
        <PasswordField
          autoComplete="current-password"
          dictionary={dictionary}
          error={Boolean(fieldErrors.currentPassword)}
          id="currentPassword"
          label={dictionary.account.currentPassword}
          visible={visibleField === "currentPassword"}
          onToggleVisibility={() =>
            setVisibleField((value) => value === "currentPassword" ? null : "currentPassword")
          }
        />
        <PasswordField
          autoComplete="new-password"
          dictionary={dictionary}
          error={Boolean(fieldErrors.nextPassword)}
          id="nextPassword"
          label={dictionary.account.nextPassword}
          minLength={8}
          visible={visibleField === "nextPassword"}
          onToggleVisibility={() =>
            setVisibleField((value) => value === "nextPassword" ? null : "nextPassword")
          }
        />
        <PasswordField
          autoComplete="new-password"
          dictionary={dictionary}
          error={Boolean(fieldErrors.confirmPassword)}
          id="confirmPassword"
          label={dictionary.account.confirmPassword}
          minLength={8}
          visible={visibleField === "confirmPassword"}
          onToggleVisibility={() =>
            setVisibleField((value) => value === "confirmPassword" ? null : "confirmPassword")
          }
        />
        <p className="text-xs text-muted-foreground">{dictionary.account.passwordSessionNotice}</p>
        <AdminDialogFooterMessage success={state.ok}>{message}</AdminDialogFooterMessage>
        <DialogFooter>
          <DialogClose asChild>
            <Button size="sm" type="button" variant="outline">
              {dictionary.common.cancel}
            </Button>
          </DialogClose>
          <AdminDialogSubmitButton
            label={dictionary.account.changePassword}
            loadingLabel={dictionary.common.saving}
          />
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function PasswordField({
  autoComplete,
  dictionary,
  error,
  id,
  label,
  minLength,
  onToggleVisibility,
  visible,
}: {
  autoComplete: string;
  dictionary: Pick<AdminDictionary, "account" | "common">;
  error: boolean;
  id: "currentPassword" | "nextPassword" | "confirmPassword";
  label: string;
  minLength?: number;
  onToggleVisibility: () => void;
  visible: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          aria-invalid={error}
          autoComplete={autoComplete}
          className={cn(
            "pr-10",
            error && "border-destructive focus-visible:ring-destructive/20",
          )}
          id={id}
          minLength={minLength}
          name={id}
          type={visible ? "text" : "password"}
        />
        <Button
          aria-label={visible ? dictionary.account.hidePassword : dictionary.account.showPassword}
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 px-0"
          type="button"
          variant="ghost"
          onClick={onToggleVisibility}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </Button>
      </div>
    </div>
  );
}
