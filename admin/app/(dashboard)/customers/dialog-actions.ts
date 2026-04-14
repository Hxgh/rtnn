"use server";

import { revalidatePath } from "next/cache";
import {
  createCustomer,
  createCustomerGroup,
  createCustomerTag,
  resetCustomerPassword,
  updateCustomer,
  updateCustomerGroup,
  updateCustomerStatus,
  updateCustomerTag,
} from "@/src/lib/api-client";
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

export type CustomerStatusDialogFormState = {
  ok: boolean;
  errorMessage: string | null;
  fieldErrors: {
    status?: boolean;
  };
};

export type CustomerPasswordResetFormState = {
  ok: boolean;
  error:
    | null
    | "required"
    | "mismatch"
    | "too-short"
    | "save-failed";
  errorMessage: string | null;
  fieldErrors: {
    nextPassword?: boolean;
    confirmPassword?: boolean;
  };
};

export type CustomerLookupDialogFormState = {
  ok: boolean;
  errorMessage: string | null;
  fieldErrors: {
    name?: boolean;
  };
};

function normalizeOptionalString(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized || undefined;
}

function revalidateCustomersPage() {
  revalidatePath(adminRoutes.customers);
}

export async function createCustomerDialogAction(
  _state: CustomerDialogFormState,
  formData: FormData,
): Promise<CustomerDialogFormState> {
  const { me, accessToken } = await requireUserSession();
  assertPermission(me, "admin:customers:create");

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const phone = normalizeOptionalString(formData.get("phone"));

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
      phone,
    });
  } catch (error) {
    return {
      ok: false,
      errorMessage: resolveErrorMessage(error),
      fieldErrors: {},
    };
  }

  revalidateCustomersPage();
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
  const phone = normalizeOptionalString(formData.get("phone"));

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
      phone,
    });
  } catch (error) {
    return {
      ok: false,
      errorMessage: resolveErrorMessage(error),
      fieldErrors: {},
    };
  }

  revalidateCustomersPage();
  return {
    ok: true,
    errorMessage: null,
    fieldErrors: {},
  };
}

export async function updateCustomerStatusDialogAction(
  _state: CustomerStatusDialogFormState,
  formData: FormData,
): Promise<CustomerStatusDialogFormState> {
  const { me, accessToken } = await requireUserSession();
  assertPermission(me, "admin:customers:update");

  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!id || !status) {
    return {
      ok: false,
      errorMessage: null,
      fieldErrors: {
        status: !status,
      },
    };
  }

  try {
    await updateCustomerStatus(accessToken, id, {
      status: status as "active" | "inactive" | "blocked",
    });
  } catch (error) {
    return {
      ok: false,
      errorMessage: resolveErrorMessage(error),
      fieldErrors: {},
    };
  }

  revalidateCustomersPage();
  return {
    ok: true,
    errorMessage: null,
    fieldErrors: {},
  };
}

export async function resetCustomerPasswordDialogAction(
  _state: CustomerPasswordResetFormState,
  formData: FormData,
): Promise<CustomerPasswordResetFormState> {
  const { me, accessToken } = await requireUserSession();
  assertPermission(me, "admin:customers:update");

  const id = String(formData.get("id") ?? "").trim();
  const nextPassword = String(formData.get("nextPassword") ?? "").trim();
  const confirmPassword = String(formData.get("confirmPassword") ?? "").trim();

  const fieldErrors: CustomerPasswordResetFormState["fieldErrors"] = {};
  if (!nextPassword) {
    fieldErrors.nextPassword = true;
  }
  if (!confirmPassword) {
    fieldErrors.confirmPassword = true;
  }

  if (!id || Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      error: "required",
      errorMessage: null,
      fieldErrors,
    };
  }

  if (nextPassword.length < 8) {
    return {
      ok: false,
      error: "too-short",
      errorMessage: null,
      fieldErrors: {
        nextPassword: true,
        confirmPassword: true,
      },
    };
  }

  if (nextPassword !== confirmPassword) {
    return {
      ok: false,
      error: "mismatch",
      errorMessage: null,
      fieldErrors: {
        nextPassword: true,
        confirmPassword: true,
      },
    };
  }

  try {
    await resetCustomerPassword(accessToken, id, { nextPassword });
  } catch (error) {
    return {
      ok: false,
      error: "save-failed",
      errorMessage: resolveErrorMessage(error),
      fieldErrors: {},
    };
  }

  revalidateCustomersPage();
  return {
    ok: true,
    error: null,
    errorMessage: null,
    fieldErrors: {},
  };
}

export async function createCustomerGroupDialogAction(
  _state: CustomerLookupDialogFormState,
  formData: FormData,
): Promise<CustomerLookupDialogFormState> {
  const { me, accessToken } = await requireUserSession();
  assertPermission(me, "admin:customer-groups:manage");

  const name = String(formData.get("name") ?? "").trim();
  const slug = normalizeOptionalString(formData.get("slug"));
  const description = normalizeOptionalString(formData.get("description"));

  if (!name) {
    return {
      ok: false,
      errorMessage: null,
      fieldErrors: {
        name: true,
      },
    };
  }

  try {
    await createCustomerGroup(accessToken, {
      name,
      slug,
      description,
    });
  } catch (error) {
    return {
      ok: false,
      errorMessage: resolveErrorMessage(error),
      fieldErrors: {},
    };
  }

  revalidateCustomersPage();
  return {
    ok: true,
    errorMessage: null,
    fieldErrors: {},
  };
}

export async function updateCustomerGroupDialogAction(
  _state: CustomerLookupDialogFormState,
  formData: FormData,
): Promise<CustomerLookupDialogFormState> {
  const { me, accessToken } = await requireUserSession();
  assertPermission(me, "admin:customer-groups:manage");

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const slug = normalizeOptionalString(formData.get("slug"));
  const description = normalizeOptionalString(formData.get("description"));

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
    await updateCustomerGroup(accessToken, id, {
      name,
      slug,
      description,
    });
  } catch (error) {
    return {
      ok: false,
      errorMessage: resolveErrorMessage(error),
      fieldErrors: {},
    };
  }

  revalidateCustomersPage();
  return {
    ok: true,
    errorMessage: null,
    fieldErrors: {},
  };
}

export async function createCustomerTagDialogAction(
  _state: CustomerLookupDialogFormState,
  formData: FormData,
): Promise<CustomerLookupDialogFormState> {
  const { me, accessToken } = await requireUserSession();
  assertPermission(me, "admin:customer-tags:manage");

  const name = String(formData.get("name") ?? "").trim();
  const slug = normalizeOptionalString(formData.get("slug"));
  const color = normalizeOptionalString(formData.get("color"));
  const description = normalizeOptionalString(formData.get("description"));

  if (!name) {
    return {
      ok: false,
      errorMessage: null,
      fieldErrors: {
        name: true,
      },
    };
  }

  try {
    await createCustomerTag(accessToken, {
      color,
      description,
      name,
      slug,
    });
  } catch (error) {
    return {
      ok: false,
      errorMessage: resolveErrorMessage(error),
      fieldErrors: {},
    };
  }

  revalidateCustomersPage();
  return {
    ok: true,
    errorMessage: null,
    fieldErrors: {},
  };
}

export async function updateCustomerTagDialogAction(
  _state: CustomerLookupDialogFormState,
  formData: FormData,
): Promise<CustomerLookupDialogFormState> {
  const { me, accessToken } = await requireUserSession();
  assertPermission(me, "admin:customer-tags:manage");

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const slug = normalizeOptionalString(formData.get("slug"));
  const color = normalizeOptionalString(formData.get("color"));
  const description = normalizeOptionalString(formData.get("description"));

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
    await updateCustomerTag(accessToken, id, {
      color,
      description,
      name,
      slug,
    });
  } catch (error) {
    return {
      ok: false,
      errorMessage: resolveErrorMessage(error),
      fieldErrors: {},
    };
  }

  revalidateCustomersPage();
  return {
    ok: true,
    errorMessage: null,
    fieldErrors: {},
  };
}
