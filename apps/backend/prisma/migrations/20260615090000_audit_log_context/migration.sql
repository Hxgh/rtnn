-- Extend audit logs with stable classification and request context.
ALTER TABLE "AuditLog" ADD COLUMN "category" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "outcome" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "requestId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "ipHash" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "userAgent" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "resourceName" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "schemaVersion" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX "AuditLog_category_createdAt_idx" ON "AuditLog"("category", "createdAt");
CREATE INDEX "AuditLog_outcome_createdAt_idx" ON "AuditLog"("outcome", "createdAt");
CREATE INDEX "AuditLog_requestId_idx" ON "AuditLog"("requestId");
