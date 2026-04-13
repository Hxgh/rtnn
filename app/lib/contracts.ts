import type {
  CustomerMeResponse,
  PermissionKey,
  UserRole
} from "@rtnn/shared-types";

export interface AppSession {
  id: string;
  email: string;
  displayName: string;
  roles: UserRole[];
  permissions: PermissionKey[];
}

export const mapMeResponseToSession = (payload: CustomerMeResponse): AppSession => ({
  id: payload.user.id,
  email: payload.user.email,
  displayName: payload.user.name,
  roles: payload.user.roles,
  permissions: payload.user.permissions,
});
