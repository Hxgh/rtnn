import { AuthAudience } from '@prisma/client';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  name: string;
  audience: AuthAudience;
  sid: string;
  ver: number;
  roles: string[];
  permissions: string[];
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  email: string;
  audience: AuthAudience;
  sid: string;
  ver: number;
  rid: string;
  type: 'refresh';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  tokenType: 'Bearer';
}
