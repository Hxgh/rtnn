import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  ClientPackageListItem,
  ClientPackageListQuery,
  ClientReleaseDetail,
  ClientReleaseSummary,
  ClientUpdatePolicySummary,
  PaginatedResult,
} from '@rtnn/shared-types';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ClientPackageListQueryDto } from './dto/client-package-list-query.dto';
import { ClientReleaseListQueryDto } from './dto/client-release-list-query.dto';
import { ClientReleaseMapper } from './client-release-mapper.service';
import { policyKey, unique } from './client-releases.utils';

@Injectable()
export class ClientReleaseQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: ClientReleaseMapper,
  ) {}

  async list(
    query: ClientReleaseListQueryDto,
  ): Promise<PaginatedResult<ClientReleaseSummary>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const packageFilter: Prisma.ClientPackageWhereInput = {
      ...(query.client ? { client: query.client } : {}),
      ...(query.target ? { target: query.target } : {}),
      ...(query.distributionStatus
        ? { distributionStatus: query.distributionStatus }
        : {}),
    };
    const hasPackageFilter = Object.keys(packageFilter).length > 0;
    const where: Prisma.ClientReleaseWhereInput = {
      ...(query.channel ? { channel: query.channel } : {}),
      ...(hasPackageFilter ? { packages: { some: packageFilter } } : {}),
      ...(query.search
        ? {
            OR: [
              {
                releaseVersion: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              { sourceSha: { contains: query.search, mode: 'insensitive' } },
              {
                packages: {
                  some: {
                    artifactName: {
                      contains: query.search,
                      mode: 'insensitive',
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.clientRelease.count({ where }),
      this.prisma.clientRelease.findMany({
        where,
        include: { packages: true },
        orderBy: [{ generatedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      data: rows.map((row) => this.mapper.toReleaseSummary(row)),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async listPackages(
    query: ClientPackageListQueryDto,
  ): Promise<PaginatedResult<ClientPackageListItem>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.buildPackageWhere(query);

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.clientPackage.count({ where }),
      this.prisma.clientPackage.findMany({
        where,
        include: { release: true },
        orderBy: [
          { release: { generatedAt: 'desc' } },
          { release: { createdAt: 'desc' } },
          { client: 'asc' },
          { target: 'asc' },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      data: rows.map((row) => this.mapper.toPackageListItem(row)),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async detail(id: string): Promise<ClientReleaseDetail> {
    const release = await this.prisma.clientRelease.findUnique({
      where: { id },
      include: {
        packages: {
          orderBy: [{ client: 'asc' }, { target: 'asc' }],
        },
      },
    });
    if (!release) {
      throw new NotFoundException('Client release not found');
    }

    const policies = await this.prisma.clientUpdatePolicy.findMany({
      where: {
        OR: release.packages.map((item) => ({
          client: item.client,
          target: item.target,
          channel: release.channel,
        })),
      },
      orderBy: [{ client: 'asc' }, { target: 'asc' }],
    });
    const optionsByPolicyKey = await this.resolvePolicyOptions(policies);

    return {
      ...this.mapper.toReleaseSummary(release),
      packages: release.packages.map((item) =>
        this.mapper.toPackageSummary(item),
      ),
      policies: policies.map((policy) =>
        this.mapper.toPolicySummary(
          policy,
          optionsByPolicyKey.get(policyKey(policy)) ?? [],
        ),
      ),
    };
  }

  async resolvePolicyOptions(
    policies: Prisma.ClientUpdatePolicyGetPayload<object>[],
  ) {
    if (policies.length === 0) {
      return new Map<string, ClientUpdatePolicySummary['releaseOptions']>();
    }

    const pairs = unique(policies.map((policy) => policyKey(policy)));
    const optionsByPolicyKey = new Map<
      string,
      ClientUpdatePolicySummary['releaseOptions']
    >();

    for (const pair of pairs) {
      const [client, target, channel] = pair.split('\u0000');
      const packageWhere = this.buildDownloadablePackageWhere(client, target);
      const releases = await this.prisma.clientRelease.findMany({
        where: {
          channel,
          dryRun: false,
          packages: {
            some: packageWhere,
          },
        },
        select: {
          id: true,
          releaseVersion: true,
          generatedAt: true,
          createdAt: true,
        },
        orderBy: [{ generatedAt: 'desc' }, { createdAt: 'desc' }],
        take: 30,
      });
      optionsByPolicyKey.set(
        `${client}\u0000${target}\u0000${channel}`,
        releases.map((release) => ({
          id: release.id,
          releaseVersion: release.releaseVersion,
          generatedAt: release.generatedAt?.toISOString() ?? null,
        })),
      );
    }

    return optionsByPolicyKey;
  }

  buildDownloadablePackageWhere(
    client: string,
    target: string,
  ): Prisma.ClientPackageWhereInput {
    return {
      client,
      target,
      distributionStatus: { notIn: ['disabled', 'pruned'] },
      OR: [
        {
          distributionStatus: 'synced',
          distributionUrl: { not: null },
        },
        {
          sourceUrl: { not: null },
        },
      ],
    };
  }

  private buildPackageWhere(
    query: ClientPackageListQuery,
  ): Prisma.ClientPackageWhereInput {
    return {
      ...(query.client ? { client: query.client } : {}),
      ...(query.target ? { target: query.target } : {}),
      ...(query.distributionStatus
        ? { distributionStatus: query.distributionStatus }
        : {}),
      ...(query.channel ? { release: { channel: query.channel } } : {}),
      ...(query.search
        ? {
            OR: [
              {
                artifactName: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                fileName: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                sha256: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                release: {
                  releaseVersion: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
              },
              {
                release: {
                  sourceSha: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
              },
            ],
          }
        : {}),
    };
  }
}
