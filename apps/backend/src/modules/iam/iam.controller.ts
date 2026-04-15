import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PERMISSIONS } from '../../common/constants/permissions.const';
import { CurrentUser } from '../../common/guards/current-user.decorator';
import { AuthSessionUser } from '../../common/guards/auth-session-user';
import { RequirePermission } from '../../common/guards/require-permission.decorator';
import { AuditActor, toAuditActor } from '../audit/audit.types';
import { AssignRolePermissionsDto } from './dto/assign-role-permissions.dto';
import { BindUserRolesDto } from './dto/bind-user-roles.dto';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { IamService } from './iam.service';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@ApiTags('admin-iam')
@ApiBearerAuth()
@Controller('admin')
export class IamController {
  constructor(private readonly iamService: IamService) {}

  @Get('users')
  @ApiOperation({ summary: 'List admin users' })
  @RequirePermission(PERMISSIONS.adminUsersView)
  listUsers(@Query() query: PaginationQueryDto) {
    return this.iamService.listUsers(query);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get admin user detail' })
  @RequirePermission(PERMISSIONS.adminUsersView)
  getUser(@Param('id') id: string) {
    return this.iamService.getUser(id);
  }

  @Post('users')
  @ApiOperation({ summary: 'Create admin user' })
  @RequirePermission(PERMISSIONS.adminUsersCreate)
  createUser(
    @CurrentUser() user: AuthSessionUser | undefined,
    @Body() dto: CreateAdminUserDto,
  ) {
    return this.iamService.createUser(requireAdminActor(user), dto);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update admin user' })
  @RequirePermission(PERMISSIONS.adminUsersUpdate)
  updateUser(
    @CurrentUser() user: AuthSessionUser | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateAdminUserDto,
  ) {
    return this.iamService.updateUser(requireAdminActor(user), id, dto);
  }

  @Post('users/:id/roles')
  @ApiOperation({ summary: 'Bind roles to admin user' })
  @RequirePermission(PERMISSIONS.adminUsersAssignRoles)
  bindUserRoles(
    @CurrentUser() user: AuthSessionUser | undefined,
    @Param('id') id: string,
    @Body() dto: BindUserRolesDto,
  ) {
    return this.iamService.bindUserRoles(requireAdminActor(user), id, dto);
  }

  @Get('roles')
  @ApiOperation({ summary: 'List roles' })
  @RequirePermission(PERMISSIONS.adminRolesView)
  listRoles(@Query() query: PaginationQueryDto) {
    return this.iamService.listRoles(query);
  }

  @Get('roles/:id')
  @ApiOperation({ summary: 'Get role detail' })
  @RequirePermission(PERMISSIONS.adminRolesView)
  getRole(@Param('id') id: string) {
    return this.iamService.getRole(id);
  }

  @Post('roles')
  @ApiOperation({ summary: 'Create role' })
  @RequirePermission(PERMISSIONS.adminRolesCreate)
  createRole(
    @CurrentUser() user: AuthSessionUser | undefined,
    @Body() dto: CreateRoleDto,
  ) {
    return this.iamService.createRole(requireAdminActor(user), dto);
  }

  @Patch('roles/:id')
  @ApiOperation({ summary: 'Update role' })
  @RequirePermission(PERMISSIONS.adminRolesUpdate)
  updateRole(
    @CurrentUser() user: AuthSessionUser | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.iamService.updateRole(requireAdminActor(user), id, dto);
  }

  @Patch('roles/:id/permissions')
  @ApiOperation({ summary: 'Assign role permissions' })
  @RequirePermission(PERMISSIONS.adminRolesUpdate)
  assignRolePermissions(
    @CurrentUser() user: AuthSessionUser | undefined,
    @Param('id') id: string,
    @Body() dto: AssignRolePermissionsDto,
  ) {
    return this.iamService.assignRolePermissions(
      requireAdminActor(user),
      id,
      dto,
    );
  }

  @Get('permissions')
  @ApiOperation({ summary: 'List permissions' })
  @RequirePermission(PERMISSIONS.adminPermissionsView)
  listPermissions() {
    return this.iamService.listPermissions();
  }
}

function requireAdminActor(user: AuthSessionUser | undefined): AuditActor {
  if (!user?.sub || user.audience !== 'admin') {
    throw new UnauthorizedException('Missing admin session user');
  }
  return toAuditActor(user);
}
