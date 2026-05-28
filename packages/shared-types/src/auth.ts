import type { PermissionKey } from "./permissions.generated";
import type { CustomerStatus } from "./customers";

export type AuthAudience = "admin" | "customer";
export type AccountStatus = "active" | "disabled" | "locked";

export type UserRole =
  | "SUPER_ADMIN"
  | "OPS_ADMIN"
  | "CONTENT_EDITOR"
  | "CUSTOMER_MANAGER"
  | "VIEWER"
  | (string & {});

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  tokenType: "Bearer";
}

interface BaseSessionUser {
  audience: AuthAudience;
  id: string;
  email: string;
  name: string;
  tenantId?: string | null;
  permissions: PermissionKey[];
  roles: UserRole[];
}

export interface AdminSessionUser extends BaseSessionUser {
  audience: "admin";
  adminProfileId?: string;
}

export interface CustomerSessionUser extends BaseSessionUser {
  audience: "customer";
  customerProfileId?: string;
  status?: CustomerStatus;
  groupIds?: string[];
  tagIds?: string[];
}

export type UserSession = AdminSessionUser;
export type AuthUser = AdminSessionUser;

export interface AdminSessionResponse {
  user: AdminSessionUser;
  tokens: SessionTokens;
}

export interface CustomerSessionResponse {
  user: CustomerSessionUser;
  tokens: SessionTokens;
}

export type SessionResponse = AdminSessionResponse;

export interface AdminMeResponse {
  user: AdminSessionUser;
}

export interface CustomerMeResponse {
  user: CustomerSessionUser;
}

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface CustomerLoginRequest {
  email: string;
  password: string;
}

export type LoginRequest = AdminLoginRequest;

export interface RefreshRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  nextPassword: string;
}
