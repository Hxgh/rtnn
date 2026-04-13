"use server";

import { revalidatePath } from "next/cache";
import { createCustomer, updateCustomer } from "@/src/lib/api-client";
import { adminRoutes } from "@/src/lib/admin-routes";
import { resolveErrorMessage } from "@/src/lib/errors";
import { assertPermission } from "@/src/lib/permissions";
import { requireUserSession } from "@/src/lib/session";

export type CustomerDialogFormState = {
  ok: boolean;
  errorMessage: string | null;
  fieldErrors: {
    name?: boolean;
    email?: boolean;
    password?: boolean;
  };
};

export async function createCustomerDialogAction(
  _state: CustomerDialogFormState,
  formData: FormData,
): Promise<CustomerDialogFormState> {
  const { me, accessToken } = await requireUserSession();
  assertPermission(me, "admin:customers:create");

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  const fieldErrors: CustomerDialogFormState["fieldErrors"] = {};
  if (!name) {
    fieldErrors.name = true;
  }
  if (!email) {
    fieldErrors.email = true;
  }
  if (!password) {
    fieldErrors.password = true;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      errorMessage: null,
      fieldErrors,
    };
  }

  try {
    await createCustomer(accessToken, {
      email,
      name,
      password,
      phone: phone || undefined,
    });
  } catch (error) {
    return {
      ok: false,
      errorMessage: resolveErrorMessage(error),
      fieldErrors: {},
    };
  }

  revalidatePath(adminRoutes.customers);
  return {
    ok: true,
    errorMessage: null,
    fieldErrors: {},
  };
}

export async function updateCustomerDialogAction(
  _state: CustomerDialogFormState,
  formData: FormData,
): Promise<CustomerDialogFormState> {
  const { me, accessToken } = await requireUserSession();
  assertPermission(me, "admin:customers:update");

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!id || !name) {
    return {
      ok: false,
      errorMessage: null,
      fieldErrors: {
        name: !name,
      },
    };
  }

  try {
    await updateCustomer(accessToken, id, {
      name,
      phone: phone || undefined,
    });
  } catch (error) {
    return {
      ok: false,
      errorMessage: resolveErrorMessage(error),
      fieldErrors: {},
    };
  }

  revalidatePath(adminRoutes.customers);
  return {
    ok: true,
    errorMessage: null,
    fieldErrors: {},
  };
}
