import { ClientReleasesService } from './client-releases.service';
import { ClientReleaseFactsDto } from './dto/client-release-facts.dto';

const now = new Date('2026-04-30T00:00:00.000Z');

function createService(prisma: unknown) {
  return new ClientReleasesService(
    prisma as never,
    { write: jest.fn() } as never,
  );
}

function createFacts(): ClientReleaseFactsDto {
  return {
    schemaVersion: 'rtnn.deploy.client-release-facts.v1',
    environment: 'testing',
    mode: 'write',
    source: {
      repository: 'acme/business-source',
      runId: '12345',
      sourceSha: '1234567890abcdef',
      sourceRefs: ['refs/tags/client-1.2.3'],
    },
    release: {
      dryRun: false,
    },
    artifacts: {
      distribution: {
        provider: 'self-hosted-static',
        keep: 1,
      },
    },
    clients: {
      appMobile: {
        android: {
          releaseVersion: '1.2.3',
          shellVersion: '0.3.0',
          shell: 'app-mobile',
          packageName: '@rtnn/app-tauri',
          channel: 'testing',
          releaseKind: 'android-signed-apk',
          sourceSha: '1234567890abcdef',
          sourceRef: 'refs/tags/client-1.2.3',
          artifactName: 'app-mobile-android-1.2.3',
          webUrl: 'https://app.testing.example.com',
          generatedAt: now.toISOString(),
          distribution: {
            provider: 'self-hosted-static',
            status: 'synced',
            sourceUrl:
              'https://github.com/acme/business-source/releases/download/client-1.2.3/app.apk',
            url: 'https://downloads.example.com/releases/testing/app-mobile/android/1.2.3/app.apk',
            fileName: 'app.apk',
            fileSize: 1024,
            sha256: 'a'.repeat(64),
            syncedAt: now.toISOString(),
            blockers: [],
          },
          mobile: {
            buildStatus: 'built',
            storeRelease: {
              provider: 'google-play',
              status: 'uploaded',
            },
          },
        },
      },
    },
  };
}

describe('ClientReleasesService', () => {
  it('syncs deploy facts into release packages and update policies', async () => {
    const tx = {
      clientRelease: {
        upsert: jest.fn().mockResolvedValue({ id: 'rel_1' }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'rel_1',
            packages: [{ id: 'pkg_current' }],
          },
          {
            id: 'rel_old',
            packages: [{ id: 'pkg_old' }],
          },
        ]),
      },
      clientPackage: {
        upsert: jest.fn().mockResolvedValue(undefined),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      clientUpdatePolicy: {
        upsert: jest.fn().mockResolvedValue(undefined),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = createService(prisma);
    const detail = jest.spyOn(service, 'detail').mockResolvedValue({
      id: 'rel_1',
      releaseVersion: '1.2.3',
      channel: 'testing',
      sourceRepository: 'acme/business-source',
      sourceRunId: '12345',
      sourceSha: '1234567890abcdef',
      sourceRef: 'refs/tags/client-1.2.3',
      dryRun: false,
      status: 'synced',
      generatedAt: now.toISOString(),
      syncedAt: now.toISOString(),
      packageCount: 1,
      downloadablePackageCount: 1,
      clients: ['appMobile'],
      targets: ['android'],
      distributionStatuses: ['synced'],
      packages: [],
      policies: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });

    await expect(service.syncFacts(createFacts())).resolves.toMatchObject({
      id: 'rel_1',
    });

    expect(tx.clientRelease.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          channel_sourceRepository_sourceRunId: {
            channel: 'testing',
            sourceRepository: 'acme/business-source',
            sourceRunId: '12345',
          },
        },
        create: expect.objectContaining({
          releaseVersion: '1.2.3',
          status: 'synced',
          generatedAt: now,
        }),
      }),
    );
    expect(tx.clientPackage.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          releaseId_artifactName: {
            releaseId: 'rel_1',
            artifactName: 'app-mobile-android-1.2.3',
          },
        },
        create: expect.objectContaining({
          releaseId: 'rel_1',
          client: 'appMobile',
          target: 'android',
          shell: 'app-mobile',
          packageName: '@rtnn/app-tauri',
          sourceUrl:
            'https://github.com/acme/business-source/releases/download/client-1.2.3/app.apk',
          distributionProvider: 'self-hosted-static',
          distributionUrl:
            'https://downloads.example.com/releases/testing/app-mobile/android/1.2.3/app.apk',
          distributionStatus: 'synced',
          fileSize: 1024,
          sha256: 'a'.repeat(64),
          buildStatus: 'built',
          storeProvider: 'google-play',
          storeStatus: 'uploaded',
        }),
      }),
    );
    expect(tx.clientUpdatePolicy.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          client_target_channel: {
            client: 'appMobile',
            target: 'android',
            channel: 'testing',
          },
        },
      }),
    );
    expect(tx.clientPackage.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['pkg_old'] } },
      data: expect.objectContaining({
        distributionStatus: 'pruned',
        prunedAt: expect.any(Date),
      }),
    });
    expect(detail).toHaveBeenCalledWith('rel_1');
  });

  it('resolves the latest self-hosted package for downloads', async () => {
    const prisma = {
      clientUpdatePolicy: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      clientRelease: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'rel_1',
            channel: 'production',
            releaseVersion: '1.2.3',
            createdAt: now,
            updatedAt: now,
            packages: [
              {
                id: 'pkg_1',
                client: 'appMobile',
                target: 'android',
                shell: 'app-mobile',
                packageName: '@rtnn/app-tauri',
                artifactName: 'app-mobile-android-1.2.3',
                shellVersion: '0.3.0',
                releaseKind: 'android-signed-apk',
                webUrl: 'https://app.example.com',
                sourceUrl:
                  'https://github.com/acme/business-source/releases/download/client-1.2.3/app.apk',
                distributionProvider: 'self-hosted-static',
                distributionUrl: 'https://downloads.example.com/app.apk',
                distributionStatus: 'synced',
                fileName: 'app.apk',
                fileSize: 1024,
                sha256: 'a'.repeat(64),
                signingStatus: null,
                buildStatus: 'built',
                updaterStatus: null,
                updaterUrl: null,
                storeProvider: null,
                storeStatus: null,
                blockers: [],
                syncedAt: now,
                prunedAt: null,
                createdAt: now,
                updatedAt: now,
              },
            ],
          },
        ]),
      },
    };
    const service = createService(prisma);

    await expect(
      service.resolveDownload({
        client: 'appMobile',
        target: 'android',
        channel: 'production',
        currentVersion: '1.0.0',
      }),
    ).resolves.toMatchObject({
      client: 'appMobile',
      target: 'android',
      channel: 'production',
      version: '1.2.3',
      shellVersion: '0.3.0',
      downloadType: 'direct',
      provider: 'self-hosted-static',
      downloadUrl: 'https://downloads.example.com/app.apk',
      updateAvailable: true,
      forceUpdate: false,
    });
  });

  it('returns unavailable when update policy is disabled', async () => {
    const service = createService({
      clientUpdatePolicy: {
        findUnique: jest.fn().mockResolvedValue({ enabled: false }),
      },
    });

    await expect(
      service.resolveDownload({
        client: 'appMobile',
        target: 'android',
        channel: 'production',
      }),
    ).resolves.toMatchObject({
      downloadType: 'unavailable',
      reason: 'disabled',
    });
  });

  it('lists packages with release metadata', async () => {
    const packageRow = {
      id: 'pkg_1',
      releaseId: 'rel_1',
      client: 'appMobile',
      target: 'android',
      shell: 'app-mobile',
      packageName: '@rtnn/app-tauri',
      artifactName: 'app-mobile-android-1.2.3',
      shellVersion: '0.3.0',
      releaseKind: 'android-signed-apk',
      webUrl: 'https://app.testing.example.com',
      sourceUrl: 'https://github.com/acme/business-source/releases/download/client-1.2.3/app.apk',
      distributionProvider: 'self-hosted-static',
      distributionUrl: 'https://downloads.example.com/app.apk',
      distributionStatus: 'synced',
      fileName: 'app.apk',
      fileSize: 1024,
      sha256: 'a'.repeat(64),
      signingStatus: null,
      buildStatus: 'built',
      updaterStatus: null,
      updaterUrl: null,
      storeProvider: null,
      storeStatus: null,
      blockers: [],
      syncedAt: now,
      prunedAt: null,
      createdAt: now,
      updatedAt: now,
      release: {
        id: 'rel_1',
        releaseVersion: '1.2.3',
        channel: 'testing',
        sourceRepository: 'acme/business-source',
        sourceRunId: '12345',
        sourceSha: '1234567890abcdef',
        sourceRef: 'refs/tags/client-1.2.3',
        dryRun: false,
        status: 'synced',
        generatedAt: now,
        syncedAt: now,
        rawFacts: {},
        createdAt: now,
        updatedAt: now,
      },
    };
    const prisma = {
      $transaction: jest.fn((operations: Array<Promise<unknown>>) =>
        Promise.all(operations),
      ),
      clientPackage: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([packageRow]),
      },
    };
    const service = createService(prisma);

    await expect(
      service.listPackages({
        page: 1,
        pageSize: 10,
        channel: 'testing',
        client: 'appMobile',
        search: '1.2.3',
      }),
    ).resolves.toMatchObject({
      data: [
        {
          id: 'pkg_1',
          releaseId: 'rel_1',
          releaseVersion: '1.2.3',
          channel: 'testing',
          releaseStatus: 'synced',
          releaseSourceSha: '1234567890abcdef',
          distributionUrl: 'https://downloads.example.com/app.apk',
        },
      ],
      meta: {
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1,
      },
    });
    expect(prisma.clientPackage.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        client: 'appMobile',
        release: { channel: 'testing' },
      }),
    });
  });

  it('rejects recommended releases outside the policy client target channel', async () => {
    const prisma = {
      $transaction: jest.fn((operations: Array<Promise<unknown>>) =>
        Promise.all(operations),
      ),
      clientUpdatePolicy: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'policy_1',
          client: 'appMobile',
          target: 'android',
          channel: 'testing',
        }),
      },
      clientRelease: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'rel_current',
          channel: 'testing',
          packages: [{ client: 'appMobile', target: 'android' }],
        }),
      },
      clientPackage: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'pkg_2',
          release: {
            id: 'rel_prod',
            channel: 'production',
          },
        }),
      },
    };
    const service = createService(prisma);

    await expect(
      service.updatePolicy(
        { type: 'admin', id: 'admin_1', name: 'Admin' },
        'rel_current',
        'policy_1',
        {
          recommendedReleaseId: 'rel_prod',
        },
      ),
    ).rejects.toThrow(
      'Recommended release is not available for this client target channel',
    );
    expect(prisma.clientPackage.findFirst).toHaveBeenCalledWith({
      where: {
        releaseId: 'rel_prod',
        client: 'appMobile',
        target: 'android',
        distributionStatus: { notIn: ['disabled', 'pruned'] },
      },
      include: { release: true },
    });
  });
});
