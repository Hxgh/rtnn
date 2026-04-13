"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import type { AdminDictionary } from "@/src/i18n/dictionaries";
import type { LoginFormState } from "@/app/(auth)/login/actions";

function SubmitButton({
  label,
  loadingLabel,
}: {
  label: string;
  loadingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? loadingLabel : label}
    </Button>
  );
}

export function LoginForm({
  action,
  dictionary,
  defaultEmail,
  defaultPassword,
}: {
  action: (
    state: LoginFormState,
    formData: FormData,
  ) => Promise<LoginFormState>;
  dictionary: Pick<AdminDictionary, "auth" | "common">;
  defaultEmail: string;
  defaultPassword: string;
}) {
  const [state, formAction] = useActionState(action, {
    ok: false,
    error: null,
  });

  const message =
    state.error === "invalid"
      ? dictionary.auth.invalid
      : state.error === "unavailable"
        ? dictionary.auth.unavailable
        : "";

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="email">{dictionary.auth.email}</Label>
        <Input
          autoComplete="username"
          defaultValue={defaultEmail}
          id="email"
          name="email"
          placeholder={dictionary.auth.emailPlaceholder}
          type="email"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">{dictionary.auth.password}</Label>
        <Input
          autoComplete="current-password"
          defaultValue={defaultPassword}
          id="password"
          name="password"
          placeholder={dictionary.auth.passwordPlaceholder}
          type="password"
          required
        />
      </div>
      <p className="min-h-5 text-sm text-destructive">{message}</p>
      <SubmitButton
        label={dictionary.auth.continue}
        loadingLabel={dictionary.common.saving}
      />
    </form>
  );
}
