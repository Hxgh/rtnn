ALTER TABLE "AuditLog"
ADD COLUMN "actorName" TEXT;

ALTER TABLE "CustomerTag"
ADD COLUMN "color" TEXT;

DROP TABLE IF EXISTS "Example" CASCADE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExampleStatus') THEN
    DROP TYPE "ExampleStatus";
  END IF;
END $$;
