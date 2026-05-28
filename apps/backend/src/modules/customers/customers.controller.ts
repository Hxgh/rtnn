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
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PERMISSIONS } from '../../common/constants/permissions.const';
import { CurrentUser } from '../../common/guards/current-user.decorator';
import { AuthSessionUser } from '../../common/guards/auth-session-user';
import { RequirePermission } from '../../common/guards/require-permission.decorator';
import { AuditActor, toAuditActor } from '../audit/audit.types';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CreateCustomerGroupDto } from './dto/create-customer-group.dto';
import { CreateCustomerTagDto } from './dto/create-customer-tag.dto';
import { ListCustomersQueryDto } from './dto/list-customers-query.dto';
import { ResetCustomerPasswordDto } from './dto/reset-customer-password.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { UpdateCustomerGroupDto } from './dto/update-customer-group.dto';
import { UpdateCustomerStatusDto } from './dto/update-customer-status.dto';
import { UpdateCustomerTagDto } from './dto/update-customer-tag.dto';
import { CustomersService } from './customers.service';
import {
  CustomerDetailDto,
  CustomerGroupListResponseDto,
  CustomerGroupSummaryDto,
  CustomerListResponseDto,
  CustomerTagListResponseDto,
  CustomerTagSummaryDto,
} from './dto/customer-response.dto';
import { SuccessResponseDto } from '../../common/dto/success-response.dto';

@ApiTags('admin-customers')
@ApiBearerAuth()
@Controller('admin')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get('customers')
  @ApiOperation({ summary: 'List customers' })
  @ApiOkResponse({ type: CustomerListResponseDto })
  @RequirePermission(PERMISSIONS.adminCustomersView)
  listCustomers(@Query() query: ListCustomersQueryDto) {
    return this.customersService.list(query);
  }

  @Get('customers/:id')
  @ApiOperation({ summary: 'Get customer detail' })
  @ApiOkResponse({ type: CustomerDetailDto })
  @RequirePermission(PERMISSIONS.adminCustomersView)
  getCustomer(@Param('id') id: string) {
    return this.customersService.getById(id);
  }

  @Post('customers')
  @ApiOperation({ summary: 'Create customer' })
  @ApiCreatedResponse({ type: CustomerDetailDto })
  @RequirePermission(PERMISSIONS.adminCustomersCreate)
  createCustomer(
    @CurrentUser() user: AuthSessionUser | undefined,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.customersService.create(requireAdminActor(user), dto);
  }

  @Patch('customers/:id')
  @ApiOperation({ summary: 'Update customer profile' })
  @ApiOkResponse({ type: CustomerDetailDto })
  @RequirePermission(PERMISSIONS.adminCustomersUpdate)
  updateCustomer(
    @CurrentUser() user: AuthSessionUser | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(requireAdminActor(user), id, dto);
  }

  @Patch('customers/:id/status')
  @ApiOperation({ summary: 'Update customer status' })
  @ApiOkResponse({ type: CustomerDetailDto })
  @RequirePermission(PERMISSIONS.adminCustomersUpdate)
  updateCustomerStatus(
    @CurrentUser() user: AuthSessionUser | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerStatusDto,
  ) {
    return this.customersService.updateStatus(requireAdminActor(user), id, dto);
  }

  @Post('customers/:id/reset-password')
  @ApiOperation({ summary: 'Reset customer password' })
  @ApiOkResponse({ type: SuccessResponseDto })
  @RequirePermission(PERMISSIONS.adminCustomersUpdate)
  resetCustomerPassword(
    @CurrentUser() user: AuthSessionUser | undefined,
    @Param('id') id: string,
    @Body() dto: ResetCustomerPasswordDto,
  ) {
    return this.customersService.resetPassword(
      requireAdminActor(user),
      id,
      dto,
    );
  }

  @Get('customer-groups')
  @ApiOperation({ summary: 'List customer groups' })
  @ApiOkResponse({ type: CustomerGroupListResponseDto })
  @RequirePermission(PERMISSIONS.adminCustomerGroupsView)
  listGroups(@Query() query: PaginationQueryDto) {
    return this.customersService.listGroups(query);
  }

  @Post('customer-groups')
  @ApiOperation({ summary: 'Create customer group' })
  @ApiCreatedResponse({ type: CustomerGroupSummaryDto })
  @RequirePermission(PERMISSIONS.adminCustomerGroupsManage)
  createGroup(
    @CurrentUser() user: AuthSessionUser | undefined,
    @Body() dto: CreateCustomerGroupDto,
  ) {
    return this.customersService.createGroup(requireAdminActor(user), dto);
  }

  @Patch('customer-groups/:id')
  @ApiOperation({ summary: 'Update customer group' })
  @ApiOkResponse({ type: CustomerGroupSummaryDto })
  @RequirePermission(PERMISSIONS.adminCustomerGroupsManage)
  updateGroup(
    @CurrentUser() user: AuthSessionUser | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerGroupDto,
  ) {
    return this.customersService.updateGroup(requireAdminActor(user), id, dto);
  }

  @Get('customer-tags')
  @ApiOperation({ summary: 'List customer tags' })
  @ApiOkResponse({ type: CustomerTagListResponseDto })
  @RequirePermission(PERMISSIONS.adminCustomerTagsView)
  listTags(@Query() query: PaginationQueryDto) {
    return this.customersService.listTags(query);
  }

  @Post('customer-tags')
  @ApiOperation({ summary: 'Create customer tag' })
  @ApiCreatedResponse({ type: CustomerTagSummaryDto })
  @RequirePermission(PERMISSIONS.adminCustomerTagsManage)
  createTag(
    @CurrentUser() user: AuthSessionUser | undefined,
    @Body() dto: CreateCustomerTagDto,
  ) {
    return this.customersService.createTag(requireAdminActor(user), dto);
  }

  @Patch('customer-tags/:id')
  @ApiOperation({ summary: 'Update customer tag' })
  @ApiOkResponse({ type: CustomerTagSummaryDto })
  @RequirePermission(PERMISSIONS.adminCustomerTagsManage)
  updateTag(
    @CurrentUser() user: AuthSessionUser | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerTagDto,
  ) {
    return this.customersService.updateTag(requireAdminActor(user), id, dto);
  }
}

function requireAdminActor(user: AuthSessionUser | undefined): AuditActor {
  if (!user?.sub || user.audience !== 'admin') {
    throw new UnauthorizedException('Missing admin session user');
  }
  return toAuditActor(user);
}
