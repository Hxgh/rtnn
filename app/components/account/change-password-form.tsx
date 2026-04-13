"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  changePasswordAction,
  initialChangePasswordState,
} from "@/app/(user)/account/actions";
import { usePreferences } from "@/components/providers/preferences-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  const { messages } = usePreferences();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? messages.common.actions.submitting : messages.security.submit}
    </Button>
  );
}

export function ChangePasswordForm() {
  const { messages } = usePreferences();
  const [state, formAction] = useActionState(
    changePasswordAction,
    initialChangePasswordState,
  );

  const errorMessage =
    state.error === "required"
      ? messages.security.errors.required
      : state.error === "mismatch"
        ? messages.security.errors.mismatch
        : state.error === "same-as-current"
          ? messages.security.errors.sameAsCurrent
          : state.error === "too-short"
            ? messages.security.errors.tooShort
            : state.error === "invalid-current"
              ? messages.security.errors.invalidCurrent
              : state.error === "session-expired"
                ? messages.security.errors.sessionExpired
                : state.error === "failed"
                  ? messages.security.errors.failed
                  : null;

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="currentPassword">{messages.security.currentPassword}</Label>
        <Input id="currentPassword" name="currentPassword" type="password" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="nextPassword">{messages.security.nextPassword}</Label>
        <Input id="nextPassword" name="nextPassword" type="password" required minLength={8} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">{messages.security.confirmPassword}</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
        />
      </div>
      {state.ok ? (
        <p className="rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground">
          {messages.security.success}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
