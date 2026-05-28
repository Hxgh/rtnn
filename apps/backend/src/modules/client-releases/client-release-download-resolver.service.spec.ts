import { ClientReleaseDownloadResolver } from './client-release-download-resolver.service';

const now = new Date('2026-04-30T00:00:00.000Z');

describe('ClientReleaseDownloadResolver', () => {
  it('reports unavailable when GitHub fallback is disabled for a source-only package', async () => {
    const prisma = {
      clientUpdatePolicy: {
        findUnique: jest.fn().mockResolvedValue({
          enabled: true,
          allowGithubFallback: false,
          recommendedReleaseId: null,
          forceUpdate: false,
          minimumSupportedVersion: null,
          notes: null,
        }),
      },
      clientRelease: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'rel_1',
            channel: 'production',
            releaseVersion: '1.2.3',
            generatedAt: now,
            syncedAt: now,
            createdAt: now,
            packages: [
              {
                id: 'pkg_1',
                client: 'appMobile',
                target: 'android',
                shellVersion: '1.2.3',
                distributionStatus: 'failed',
                distributionProvider: 'github-release',
                distributionUrl: null,
                sourceUrl:
                  'https://github.com/acme/rtnn/releases/download/client-1.2.3/app.apk',
                fileName: 'app.apk',
                fileSize: 1024,
                sha256: 'a'.repeat(64),
                syncedAt: null,
              },
            ],
          },
        ]),
      },
    };
    const resolver = new ClientReleaseDownloadResolver(prisma as never);

    await expect(
      resolver.resolveDownload({
        client: 'appMobile',
        target: 'android',
        channel: 'production',
      }),
    ).resolves.toMatchObject({
      downloadType: 'unavailable',
      downloadUrl: null,
      provider: null,
      reason: 'github-fallback-disabled',
      sourceUrl:
        'https://github.com/acme/rtnn/releases/download/client-1.2.3/app.apk',
    });
  });
});
