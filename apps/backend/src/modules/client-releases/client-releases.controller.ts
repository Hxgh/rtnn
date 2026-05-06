import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '../../common/constants/permissions.const';
import { CurrentUser } from '../../common/guards/current-user.decorator';
import { AuthSessionUser } from '../../common/guards/auth-session-user';
import { Public } from '../../common/guards/public.decorator';
import { RequirePermission } from '../../common/guards/require-permission.decorator';
import { AppConfigService } from '../../core/config/app-config.service';
import { AuditActor, toAuditActor } from '../audit/audit.types';
import { ClientDownloadListQueryDto } from './dto/client-download-list-query.dto';
import { ClientDownloadQueryDto } from './dto/client-download-query.dto';
import { ClientPackageListQueryDto } from './dto/client-package-list-query.dto';
import { ClientReleaseFactsDto } from './dto/client-release-facts.dto';
import { ClientReleaseListQueryDto } from './dto/client-release-list-query.dto';
import { UpdateClientReleasePolicyDto } from './dto/update-client-release-policy.dto';
import { ClientReleasesService } from './client-releases.service';

@ApiTags('internal-client-releases')
@Controller('internal/client-release-facts')
export class ClientReleaseFactsController {
  constructor(
    private readonly appConfig: AppConfigService,
    private readonly clientReleasesService: ClientReleasesService,
  ) {}

  @Post()
  @Public()
  @ApiOperation({ summary: 'Sync client release facts from deploy executor' })
  syncFacts(
    @Headers('x-rtnn-client-release-token') token: string | undefined,
    @Body() dto: ClientReleaseFactsDto,
  ) {
    this.assertFactsToken(token);
    return this.clientReleasesService.syncFacts(dto);
  }

  private assertFactsToken(token: string | undefined) {
    const expected = this.appConfig.clientReleaseFactsToken;
    if (!expected || token !== expected) {
      throw new UnauthorizedException('Invalid client release facts token');
    }
  }
}

@ApiTags('admin-client-releases')
@ApiBearerAuth()
@Controller('admin/client-releases')
export class ClientReleasesAdminController {
  constructor(private readonly clientReleasesService: ClientReleasesService) {}

  @Get()
  @ApiOperation({ summary: 'List client shell releases' })
  @RequirePermission(PERMISSIONS.adminClientReleasesView)
  list(@Query() query: ClientReleaseListQueryDto) {
    return this.clientReleasesService.list(query);
  }

  @Get('packages')
  @ApiOperation({ summary: 'List client release packages' })
  @RequirePermission(PERMISSIONS.adminClientReleasesView)
  listPackages(@Query() query: ClientPackageListQueryDto) {
    return this.clientReleasesService.listPackages(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get client shell release detail' })
  @RequirePermission(PERMISSIONS.adminClientReleasesView)
  detail(@Param('id') id: string) {
    return this.clientReleasesService.detail(id);
  }

  @Patch(':releaseId/policies/:policyId')
  @ApiOperation({ summary: 'Update client shell update policy' })
  @RequirePermission(PERMISSIONS.adminClientReleasesManagePolicy)
  updatePolicy(
    @CurrentUser() user: AuthSessionUser | undefined,
    @Param('releaseId') releaseId: string,
    @Param('policyId') policyId: string,
    @Body() dto: UpdateClientReleasePolicyDto,
  ) {
    return this.clientReleasesService.updatePolicy(
      requireAdminActor(user),
      releaseId,
      policyId,
      dto,
    );
  }
}

@ApiTags('client-downloads')
@Controller('client-downloads')
export class ClientDownloadsController {
  constructor(private readonly clientReleasesService: ClientReleasesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List latest available client downloads' })
  list(@Query() query: ClientDownloadListQueryDto) {
    return this.clientReleasesService.listDownloads(query);
  }

  @Get('latest')
  @Public()
  @ApiOperation({ summary: 'Resolve latest client download URL' })
  latest(@Query() query: ClientDownloadQueryDto) {
    return this.clientReleasesService.resolveDownload(query);
  }
}

@ApiTags('client-updates')
@Controller('client-updates')
export class ClientUpdatesController {
  constructor(private readonly clientReleasesService: ClientReleasesService) {}

  @Get('check')
  @Public()
  @ApiOperation({ summary: 'Check client shell update availability' })
  check(@Query() query: ClientDownloadQueryDto) {
    return this.clientReleasesService.checkUpdate(query);
  }
}

function requireAdminActor(user: AuthSessionUser | undefined): AuditActor {
  if (!user?.sub || user.audience !== 'admin') {
    throw new UnauthorizedException('Missing admin session user');
  }
  return toAuditActor(user);
}
