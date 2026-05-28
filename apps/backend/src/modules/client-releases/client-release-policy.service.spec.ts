import { BadRequestException } from '@nestjs/common';
import { ClientReleasePolicyService } from './client-release-policy.service';

describe('ClientReleasePolicyService', () => {
  it('rejects recommended releases that cannot be downloaded with a stable code', async () => {
    const prisma = {
      $transaction: jest.fn((input: unknown) =>
        Array.isArray(input)
          ? Promise.all(input)
          : Promise.reject(new Error('Unexpected transaction callback')),
      ),
      clientUpdatePolicy: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'policy_1',
          client: 'appMobile',
          target: 'android',
          channel: 'production',
          allowGithubFallback: false,
        }),
      },
      clientRelease: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'rel_current',
          channel: 'production',
          packages: [{ client: 'appMobile', target: 'android' }],
        }),
      },
    };
    const downloads = {
      findPackageByReleaseId: jest.fn().mockResolvedValue({
        id: 'pkg_1',
        release: {
          id: 'rel_source_only',
          channel: 'production',
        },
      }),
      resolvePackageDownloadUrl: jest.fn().mockReturnValue(null),
    };
    const service = new ClientReleasePolicyService(
      prisma as never,
      { write: jest.fn() } as never,
      downloads as never,
      { resolvePolicyOptions: jest.fn() } as never,
      { toPolicySummary: jest.fn() } as never,
    );

    try {
      await service.updatePolicy(
        { type: 'admin', id: 'admin_1', name: 'Admin' },
        'rel_current',
        'policy_1',
        {
          recommendedReleaseId: 'rel_source_only',
          allowGithubFallback: false,
        },
      );
      throw new Error('Expected recommended release validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toEqual({
        code: 'CLIENT_RELEASE_POLICY_INVALID_RECOMMENDATION',
        message:
          'Recommended release does not have a downloadable package for this policy',
      });
    }
  });
});
