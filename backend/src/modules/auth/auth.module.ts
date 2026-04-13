import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { AppConfigService } from '../../core/config/app-config.service';
import { AuditModule } from '../audit/audit.module';
import { AuthAdminController, AuthCustomerController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthTokenService } from './auth-token.service';
import { LoginRateLimitService } from './login-rate-limit.service';
import { PasswordService } from './password.service';

@Module({
  imports: [
    AuditModule,
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        secret: config.jwtAccessSecret,
      }),
    }),
  ],
  controllers: [AuthAdminController, AuthCustomerController],
  providers: [
    AuthService,
    AuthTokenService,
    PasswordService,
    LoginRateLimitService,
    {
      provide: APP_GUARD,
      useClass: AccessTokenGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
  ],
  exports: [AuthService, AuthTokenService, PasswordService],
})
export class AuthModule {}
