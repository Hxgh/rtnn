"use server";

import { revalidatePath } from "next/cache";
import { API_PERMISSIONS } from "@rtnn/shared-types";
import { createRole, updateRole } from "@/src/lib/api-client";
import { adminRoutes } from "@/src/lib/admin-routes";
import { resolveErrorMessage } from "@/src/lib/errors";
import { assertPermission } from "@/src/lib/permissions";
import { requireUserSession } from "@/src/lib/session";

export type RoleDialogFormState = {
  ok: boolean;
  errorMessage: string | null;
  fieldErrors: {
    name?: boolean;
  };
};

export async function createRoleDialogAction(
  _state: RoleDialogFormState,
  formData: FormData,
): Promise<RoleDialogFormState> {
  const { me, accessToken } = await requireUserSession();
  assertPermission(me, API_PERMISSIONS.adminRolesCreate);

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const permissionKeys = formData
    .getAll("permissionKeys")
    .map((item) => String(item).trim())
    .filter(Boolean);

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
    await createRole(accessToken, {
      name,
      description: description || undefined,
      permissionKeys,
    });
  } catch (error) {
    return {
      ok: false,
      errorMessage: resolveErrorMessage(error),
      fieldErrors: {},
    };
  }

  revalidatePath(adminRoutes.roles.list);
  return {
    ok: true,
    errorMessage: null,
    fieldErrors: {},
  };
}

export async function updateRoleDialogAction(
  _state: RoleDialogFormState,
  formData: FormData,
): Promise<RoleDialogFormState> {
  const { me, accessToken } = await requireUserSession();
  assertPermission(me, API_PERMISSIONS.adminRolesUpdate);

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const permissionKeys = formData
    .getAll("permissionKeys")
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
    await updateRole(accessToken, id, {
      name,
      description: description || undefined,
      permissionKeys,
    });
  } catch (error) {
    return {
      ok: false,
      errorMessage: resolveErrorMessage(error),
      fieldErrors: {},
    };
  }

  revalidatePath(adminRoutes.roles.list);
  revalidatePath(adminRoutes.roles.detail(id));
  return {
    ok: true,
    errorMessage: null,
    fieldErrors: {},
  };
}
