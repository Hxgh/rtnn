-- This migration is a template baseline for identity + RBAC refactor.
-- Keep this SQL intentionally conservative for local bootstrap.

CREATE TYPE "AuthAudience" AS ENUM ('admin', 'customer');
CREATE TYPE "AccountStatus" AS ENUM ('active', 'disabled', 'locked');
CREATE TYPE "CustomerStatus" AS ENUM ('active', 'inactive', 'blocked');

CREATE TABLE "Tenant" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Account" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "status" "AccountStatus" NOT NULL DEFAULT 'active',
  "tenantId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastLoginAt" TIMESTAMP(3)
);

CREATE TABLE "AdminProfile" (
  "id" TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL UNIQUE,
  "tenantId" TEXT,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "CustomerProfile" (
  "id" TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL UNIQUE,
  "tenantId" TEXT,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "status" "CustomerStatus" NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Permission" (
  "id" TEXT PRIMARY KEY,
  "key" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Role" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT,
  "slug" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "AccountRole" (
  "id" TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "audience" "AuthAudience" NOT NULL,
  "tenantId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "RolePermission" (
  "id" TEXT PRIMARY KEY,
  "roleId" TEXT NOT NULL,
  "permissionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "RefreshSession" (
  "id" TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "audience" "AuthAudience" NOT NULL,
  "tokenHash" TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "replacedBy" TEXT,
  "tenantId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "LoginEvent" (
  "id" TEXT PRIMARY KEY,
  "accountId" TEXT,
  "audience" "AuthAudience" NOT NULL,
  "email" TEXT NOT NULL,
  "success" BOOLEAN NOT NULL,
  "reason" TEXT,
  "ip" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "CustomerGroup" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "CustomerTag" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "CustomerGroupMember" (
  "id" TEXT PRIMARY KEY,
  "groupId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "CustomerTagMember" (
  "id" TEXT PRIMARY KEY,
  "tagId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "AuditLog" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT,
  "actorAccountId" TEXT,
  "actorAudience" "AuthAudience",
  "action" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "resourceId" TEXT,
  "detail" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "Example" RENAME COLUMN "owner" TO "ownerName";
ALTER TABLE "Example" ADD COLUMN "ownerAccountId" TEXT;

INSERT INTO "Account" (
  "id",
  "email",
  "passwordHash",
  "status",
  "createdAt",
  "updatedAt"
)
SELECT
  "id",
  "email",
  "passwordHash",
  'active'::"AccountStatus",
  "createdAt",
  "updatedAt"
FROM "User";

INSERT INTO "AdminProfile" (
  "id",
  "accountId",
  "name",
  "createdAt",
  "updatedAt"
)
SELECT
  "id",
  "id",
  COALESCE(NULLIF(TRIM("displayName"), ''), split_part("email", '@', 1)),
  "createdAt",
  "updatedAt"
FROM "User";

INSERT INTO "RefreshSession" (
  "id",
  "accountId",
  "audience",
  "tokenHash",
  "expiresAt",
  "revokedAt",
  "replacedBy",
  "createdAt"
)
SELECT
  "id",
  "userId",
  'admin'::"AuthAudience",
  "tokenHash",
  "expiresAt",
  "revokedAt",
  "replacedBy",
  "createdAt"
FROM "RefreshToken";

DROP TABLE "RefreshToken";
DROP TABLE "User";

CREATE UNIQUE INDEX "AccountRole_account_role_audience_key" ON "AccountRole"("accountId", "roleId", "audience");
CREATE UNIQUE INDEX "RolePermission_role_permission_key" ON "RolePermission"("roleId", "permissionId");
CREATE UNIQUE INDEX "CustomerGroupMember_group_customer_key" ON "CustomerGroupMember"("groupId", "customerId");
CREATE UNIQUE INDEX "CustomerTagMember_tag_customer_key" ON "CustomerTagMember"("tagId", "customerId");

CREATE INDEX "RefreshSession_accountId_idx" ON "RefreshSession"("accountId");
CREATE INDEX "RefreshSession_expiresAt_idx" ON "RefreshSession"("expiresAt");
CREATE INDEX "LoginEvent_email_audience_idx" ON "LoginEvent"("email", "audience");
CREATE INDEX "LoginEvent_createdAt_idx" ON "LoginEvent"("createdAt");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_resource_resourceId_idx" ON "AuditLog"("resource", "resourceId");

ALTER TABLE "AdminProfile" ADD CONSTRAINT "AdminProfile_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE;
ALTER TABLE "CustomerProfile" ADD CONSTRAINT "CustomerProfile_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE;
ALTER TABLE "AccountRole" ADD CONSTRAINT "AccountRole_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE;
ALTER TABLE "AccountRole" ADD CONSTRAINT "AccountRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE;
ALTER TABLE "RefreshSession" ADD CONSTRAINT "RefreshSession_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE;
ALTER TABLE "LoginEvent" ADD CONSTRAINT "LoginEvent_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL;
ALTER TABLE "CustomerGroupMember" ADD CONSTRAINT "CustomerGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CustomerGroup"("id") ON DELETE CASCADE;
ALTER TABLE "CustomerGroupMember" ADD CONSTRAINT "CustomerGroupMember_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE;
ALTER TABLE "CustomerTagMember" ADD CONSTRAINT "CustomerTagMember_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "CustomerTag"("id") ON DELETE CASCADE;
ALTER TABLE "CustomerTagMember" ADD CONSTRAINT "CustomerTagMember_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE;
ALTER TABLE "Example" ADD CONSTRAINT "Example_ownerAccountId_fkey" FOREIGN KEY ("ownerAccountId") REFERENCES "Account"("id") ON DELETE SET NULL;
