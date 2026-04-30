CREATE TABLE "ClientRelease" (
    "id" TEXT NOT NULL,
    "releaseVersion" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "sourceRepository" TEXT NOT NULL,
    "sourceRunId" TEXT,
    "sourceSha" TEXT NOT NULL,
    "sourceRef" TEXT,
    "dryRun" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'synced',
    "generatedAt" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3),
    "rawFacts" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientRelease_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientPackage" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "shell" TEXT NOT NULL,
    "packageName" TEXT,
    "artifactName" TEXT NOT NULL,
    "shellVersion" TEXT NOT NULL,
    "releaseKind" TEXT NOT NULL,
    "webUrl" TEXT,
    "sourceUrl" TEXT,
    "distributionProvider" TEXT NOT NULL DEFAULT 'github-release',
    "distributionUrl" TEXT,
    "distributionStatus" TEXT NOT NULL DEFAULT 'pending',
    "fileName" TEXT,
    "fileSize" INTEGER,
    "sha256" TEXT,
    "signingStatus" TEXT,
    "buildStatus" TEXT,
    "updaterStatus" TEXT,
    "updaterUrl" TEXT,
    "storeProvider" TEXT,
    "storeStatus" TEXT,
    "blockers" JSONB,
    "rawManifest" JSONB,
    "rawFacts" JSONB,
    "syncedAt" TIMESTAMP(3),
    "prunedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientPackage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientUpdatePolicy" (
    "id" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "recommendedReleaseId" TEXT,
    "minimumSupportedVersion" TEXT,
    "forceUpdate" BOOLEAN NOT NULL DEFAULT false,
    "allowGithubFallback" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientUpdatePolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClientRelease_channel_sourceRepository_sourceRunId_key" ON "ClientRelease"("channel", "sourceRepository", "sourceRunId");
CREATE INDEX "ClientRelease_channel_releaseVersion_idx" ON "ClientRelease"("channel", "releaseVersion");
CREATE INDEX "ClientRelease_sourceSha_idx" ON "ClientRelease"("sourceSha");
CREATE UNIQUE INDEX "ClientPackage_releaseId_artifactName_key" ON "ClientPackage"("releaseId", "artifactName");
CREATE INDEX "ClientPackage_client_target_distributionStatus_idx" ON "ClientPackage"("client", "target", "distributionStatus");
CREATE INDEX "ClientPackage_artifactName_idx" ON "ClientPackage"("artifactName");
CREATE UNIQUE INDEX "ClientUpdatePolicy_client_target_channel_key" ON "ClientUpdatePolicy"("client", "target", "channel");
CREATE INDEX "ClientUpdatePolicy_channel_idx" ON "ClientUpdatePolicy"("channel");

ALTER TABLE "ClientPackage"
ADD CONSTRAINT "ClientPackage_releaseId_fkey"
FOREIGN KEY ("releaseId") REFERENCES "ClientRelease"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
