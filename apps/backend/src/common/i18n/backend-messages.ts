import type { SupportedLocale } from '@rtnn/config';

const zhCNMessages: Record<string, string> = {
  'Internal server error': '服务器内部错误',
  'Missing bearer token': '缺少 Bearer 令牌',
  'Permission denied': '权限不足',
  'Missing session user': '缺少会话用户信息',
  'Admin user not found': '管理员用户不存在',
  'Role not found': '角色不存在',
  'Permission not found': '权限不存在',
  'Invalid access token type': '访问令牌类型无效',
  'Invalid or expired access token': '访问令牌无效或已过期',
  'Invalid refresh token type': '刷新令牌类型无效',
  'Invalid or expired refresh token': '刷新令牌无效或已过期',
  'Invalid audience': '身份范围无效',
  'Too many login attempts. Please retry later.':
    '登录尝试次数过多，请稍后再试。',
  'Invalid credentials': '账号或密码错误',
  'Account is not active': '账号未激活',
  'Refresh token audience mismatch': '刷新令牌身份范围不匹配',
  'Refresh token is invalid or revoked': '刷新令牌无效或已被撤销',
  'Refresh token is expired': '刷新令牌已过期',
  'Refresh token payload mismatch': '刷新令牌载荷不匹配',
  'Account not found': '账号不存在',
  'Session is expired': '会话已过期',
  'Old password is invalid': '原密码错误',
  'New password must differ from current password': '新密码不能与当前密码相同',
  'Admin profile not found': '管理员资料不存在',
  'Customer profile not found': '客户资料不存在',
  'Customer is blocked': '客户已被封禁',
  'Missing admin session user': '缺少管理员会话用户信息',
  'Missing customer session user': '缺少客户会话用户信息',
  'Customer not found': '客户不存在',
  'Customer profile was not created': '客户资料尚未创建',
  'Invalid client release facts token': '客户端发布事实令牌无效',
  'Unsupported client release facts schema': '客户端发布事实格式不受支持',
  'Client release facts do not contain packages': '客户端发布事实不包含安装包',
  'Client release not found': '客户端发布版本不存在',
  'Client update policy not found': '客户端更新策略不存在',
  'Recommended release is not available for this client target channel':
    '推荐版本不属于当前客户端、目标平台或环境',
  'Recommended release does not have a downloadable package for this policy':
    '推荐版本在当前策略下没有可下载安装包',
};

const messageCodes: Record<string, string> = {
  'Internal server error': 'INTERNAL_SERVER_ERROR',
  'Missing bearer token': 'MISSING_BEARER_TOKEN',
  'Permission denied': 'PERMISSION_DENIED',
  'Missing session user': 'MISSING_SESSION_USER',
  'Admin user not found': 'ADMIN_USER_NOT_FOUND',
  'Role not found': 'ROLE_NOT_FOUND',
  'Permission not found': 'PERMISSION_NOT_FOUND',
  'Invalid access token type': 'INVALID_ACCESS_TOKEN_TYPE',
  'Invalid or expired access token': 'INVALID_OR_EXPIRED_ACCESS_TOKEN',
  'Invalid refresh token type': 'INVALID_REFRESH_TOKEN_TYPE',
  'Invalid or expired refresh token': 'INVALID_OR_EXPIRED_REFRESH_TOKEN',
  'Invalid audience': 'INVALID_AUDIENCE',
  'Too many login attempts. Please retry later.': 'LOGIN_RATE_LIMITED',
  'Invalid credentials': 'INVALID_CREDENTIALS',
  'Account is not active': 'ACCOUNT_NOT_ACTIVE',
  'Refresh token audience mismatch': 'REFRESH_TOKEN_AUDIENCE_MISMATCH',
  'Refresh token is invalid or revoked': 'REFRESH_TOKEN_INVALID_OR_REVOKED',
  'Refresh token is expired': 'REFRESH_TOKEN_EXPIRED',
  'Refresh token payload mismatch': 'REFRESH_TOKEN_PAYLOAD_MISMATCH',
  'Account not found': 'ACCOUNT_NOT_FOUND',
  'Session is expired': 'SESSION_EXPIRED',
  'Old password is invalid': 'OLD_PASSWORD_INVALID',
  'New password must differ from current password': 'NEW_PASSWORD_MUST_DIFFER',
  'Admin profile not found': 'ADMIN_PROFILE_NOT_FOUND',
  'Customer profile not found': 'CUSTOMER_PROFILE_NOT_FOUND',
  'Customer is blocked': 'CUSTOMER_BLOCKED',
  'Missing admin session user': 'MISSING_ADMIN_SESSION_USER',
  'Missing customer session user': 'MISSING_CUSTOMER_SESSION_USER',
  'Customer not found': 'CUSTOMER_NOT_FOUND',
  'Customer profile was not created': 'CUSTOMER_PROFILE_NOT_CREATED',
  'Invalid client release facts token': 'CLIENT_RELEASE_FACTS_INVALID_TOKEN',
  'Unsupported client release facts schema':
    'CLIENT_RELEASE_FACTS_UNSUPPORTED_SCHEMA',
  'Client release facts do not contain packages':
    'CLIENT_RELEASE_FACTS_EMPTY_PACKAGES',
  'Client release not found': 'CLIENT_RELEASE_NOT_FOUND',
  'Client update policy not found': 'CLIENT_RELEASE_POLICY_NOT_FOUND',
  'Recommended release is not available for this client target channel':
    'CLIENT_RELEASE_POLICY_INVALID_RECOMMENDATION',
  'Recommended release does not have a downloadable package for this policy':
    'CLIENT_RELEASE_POLICY_INVALID_RECOMMENDATION',
};

const catalogs: Record<SupportedLocale, Record<string, string>> = {
  'zh-CN': zhCNMessages,
  'en-US': {},
};

function translateMessage(message: string, locale: SupportedLocale) {
  return catalogs[locale][message] ?? message;
}

export function getBackendMessageCode(message: string): string | undefined {
  return messageCodes[message];
}

export function localizeBackendPayload(
  payload: unknown,
  locale: SupportedLocale,
): unknown {
  if (typeof payload === 'string') {
    return translateMessage(payload, locale);
  }

  if (Array.isArray(payload)) {
    return payload.map((item: unknown) =>
      typeof item === 'string' ? translateMessage(item, locale) : item,
    );
  }

  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  const nextPayload = { ...(payload as Record<string, unknown>) };

  if (typeof nextPayload.message === 'string') {
    nextPayload.message = translateMessage(nextPayload.message, locale);
  } else if (Array.isArray(nextPayload.message)) {
    nextPayload.message = nextPayload.message.map((item: unknown) =>
      typeof item === 'string' ? translateMessage(item, locale) : item,
    );
  }

  if (typeof nextPayload.error === 'string') {
    nextPayload.error = translateMessage(nextPayload.error, locale);
  }

  return nextPayload;
}
