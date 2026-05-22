"use server";

import { revalidatePath } from "next/cache";
import { API_PERMISSIONS } from "@rtnn/shared-types";
import { createUser, updateUser } from "@/src/lib/api-client";
import { adminRoutes } from "@/src/lib/admin-routes";
import { resolveErrorMessage } from "@/src/lib/errors";
import { assertPermission } from "@/src/lib/permissions";
import { requireUserSession } from "@/src/lib/session";

export type UserDialogFormState = {
  ok: boolean;
  errorMessage: string | null;
  fieldErrors: {
    name?: boolean;
    email?: boolean;
    password?: boolean;
  };
};

export async function createUserDialogAction(
  _state: UserDialogFormState,
  formData: FormData,
): Promise<UserDialogFormState> {
  const { me, accessToken } = await requireUserSession();
  assertPermission(me, API_PERMISSIONS.adminUsersCreate);

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const roleIds = formData
    .getAll("roleIds")
    .map((item) => String(item).trim())
    .filter(Boolean);

  const fieldErrors: UserDialogFormState["fieldErrors"] = {};
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
    await createUser(accessToken, {
      name,
      email,
      password,
      roleIds,
    });
  } catch (error) {
    return {
      ok: false,
      errorMessage: resolveErrorMessage(error),
      fieldErrors: {},
    };
  }

  revalidatePath(adminRoutes.users.list);
  return {
    ok: true,
    errorMessage: null,
    fieldErrors: {},
  };
}

export async function updateUserDialogAction(
  _state: UserDialogFormState,
  formData: FormData,
): Promise<UserDialogFormState> {
  const { me, accessToken } = await requireUserSession();
  assertPermission(me, API_PERMISSIONS.adminUsersUpdate);

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const status = String(formData.get("status") ?? "active").trim() as
    | "active"
    | "disabled";
  const roleIds = formData
    .getAll("roleIds")
    .map((item) => String(item).trim())
    .filter(Boolean);

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
    await updateUser(accessToken, id, {
      name,
      status,
      roleIds,
    });
  } catch (error) {
    return {
      ok: false,
      errorMessage: resolveErrorMessage(error),
      fieldErrors: {},
    };
  }

  revalidatePath(adminRoutes.users.list);
  revalidatePath(adminRoutes.users.detail(id));
  return {
    ok: true,
    errorMessage: null,
    fieldErrors: {},
  };
}
