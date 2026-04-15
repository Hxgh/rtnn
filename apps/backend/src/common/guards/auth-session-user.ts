import { AuthAudience } from '@prisma/client';

export interface AuthSessionUser {
  sub: string;
  email: string;
  name: string;
  audience: AuthAudience;
  sid: string;
  roles: string[];
  permissions: string[];
}
