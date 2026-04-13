import type { SupportedLocale } from '@rtnn/config';

const zhCNMessages: Record<string, string> = {
  'Internal server error': '服务器内部错误',
  'Missing bearer token': '缺少 Bearer 令牌',
  'Permission denied': '权限不足',
  'Missing session user': '缺少会话用户信息',
  'Admin user not found': '管理员用户不存在',
  'Role not found': '角色不存在',
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
};

const catalogs: Record<SupportedLocale, Record<string, string>> = {
  'zh-CN': zhCNMessages,
  'en-US': {},
};

function translateMessage(message: string, locale: SupportedLocale) {
  return catalogs[locale][message] ?? message;
}

export function localizeBackendPayload(
  payload: unknown,
  locale: SupportedLocale,
): unknown {
  if (typeof payload === 'string') {
    return translateMessage(payload, locale);
  }

  if (Array.isArray(payload)) {
    return payload.map((item) =>
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
    nextPayload.message = nextPayload.message.map((item) =>
      typeof item === 'string' ? translateMessage(item, locale) : item,
    );
  }

  if (typeof nextPayload.error === 'string') {
    nextPayload.error = translateMessage(nextPayload.error, locale);
  }

  return nextPayload;
}
