import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../../common/guards/current-user.decorator';
import { Public } from '../../common/guards/public.decorator';
import { AuthSessionUser } from '../../common/guards/auth-session-user';
import { toAuditActor } from '../audit/audit.types';
import {
  AdminMeResponse,
  AdminSessionResponse,
  AuthService,
  CustomerMeResponse,
  CustomerSessionResponse,
} from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AdminMeResponseDto } from './dto/admin-me-response.dto';
import { AdminSessionResponseDto } from './dto/admin-session-response.dto';
import { CustomerMeResponseDto } from './dto/customer-me-response.dto';
import { CustomerSessionResponseDto } from './dto/customer-session-response.dto';
import { LogoutResponseDto } from './dto/logout-response.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';

@ApiTags('auth-admin')
@Controller('auth/admin')
export class AuthAdminController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Admin login' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ type: AdminSessionResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid login payload' })
  login(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ): Promise<AdminSessionResponse> {
    return this.authService.login(dto, 'admin', {
      ip: req.ip,
      userAgent: req.header('user-agent') ?? undefined,
    });
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Admin refresh token' })
  @ApiBody({ type: RefreshDto })
  @ApiOkResponse({ type: AdminSessionResponseDto })
  @ApiUnauthorizedResponse({ description: 'Refresh token is invalid' })
  refresh(@Body() dto: RefreshDto): Promise<AdminSessionResponse> {
    return this.authService.refresh(dto.refreshToken, 'admin');
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Admin logout' })
  @ApiBody({ type: LogoutDto })
  @ApiOkResponse({ type: LogoutResponseDto })
  logout(@Body() dto: LogoutDto): Promise<{ success: true }> {
    return this.authService.logout(dto.refreshToken, 'admin');
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current admin session profile' })
  @ApiOkResponse({ type: AdminMeResponseDto })
  me(
    @CurrentUser() user: AuthSessionUser | undefined,
  ): Promise<AdminMeResponse> {
    if (!user?.sub || user.audience !== 'admin') {
      throw new UnauthorizedException('Missing admin session user');
    }
    return this.authService.getMeResponse(user.sub, 'admin');
  }

  @Post('change-password')
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: 'Change admin password' })
  @ApiOkResponse({ type: AdminSessionResponseDto })
  changePassword(
    @CurrentUser() user: AuthSessionUser | undefined,
    @Body() dto: ChangePasswordDto,
  ): Promise<AdminSessionResponse> {
    if (!user?.sub || user.audience !== 'admin') {
      throw new UnauthorizedException('Missing admin session user');
    }
    return this.authService.changePassword(
      toAuditActor(user),
      user.sub,
      'admin',
      dto.currentPassword,
      dto.nextPassword,
    );
  }
}

@ApiTags('auth-customer')
@Controller('auth/customer')
export class AuthCustomerController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Customer login' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ type: CustomerSessionResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid login payload' })
  login(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ): Promise<CustomerSessionResponse> {
    return this.authService.login(dto, 'customer', {
      ip: req.ip,
      userAgent: req.header('user-agent') ?? undefined,
    });
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Customer refresh token' })
  @ApiBody({ type: RefreshDto })
  @ApiOkResponse({ type: CustomerSessionResponseDto })
  refresh(@Body() dto: RefreshDto): Promise<CustomerSessionResponse> {
    return this.authService.refresh(dto.refreshToken, 'customer');
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Customer logout' })
  @ApiBody({ type: LogoutDto })
  @ApiOkResponse({ type: LogoutResponseDto })
  logout(@Body() dto: LogoutDto): Promise<{ success: true }> {
    return this.authService.logout(dto.refreshToken, 'customer');
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current customer session profile' })
  @ApiOkResponse({ type: CustomerMeResponseDto })
  me(
    @CurrentUser() user: AuthSessionUser | undefined,
  ): Promise<CustomerMeResponse> {
    if (!user?.sub || user.audience !== 'customer') {
      throw new UnauthorizedException('Missing customer session user');
    }
    return this.authService.getMeResponse(user.sub, 'customer');
  }

  @Post('change-password')
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: 'Change customer password' })
  @ApiOkResponse({ type: CustomerSessionResponseDto })
  changePassword(
    @CurrentUser() user: AuthSessionUser | undefined,
    @Body() dto: ChangePasswordDto,
  ): Promise<CustomerSessionResponse> {
    if (!user?.sub || user.audience !== 'customer') {
      throw new UnauthorizedException('Missing customer session user');
    }
    return this.authService.changePassword(
      toAuditActor(user),
      user.sub,
      'customer',
      dto.currentPassword,
      dto.nextPassword,
    );
  }
}
