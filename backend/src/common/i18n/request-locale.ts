import {
  normalizeSupportedLocale,
  resolveLocaleFromAcceptLanguage,
  type SupportedLocale,
} from '@rtnn/config';
import type { Request } from 'express';

export interface LocaleRequest extends Request {
  locale?: SupportedLocale;
}

export function resolveRequestLocale(request: Request): SupportedLocale {
  const explicitLocale = request.header('x-locale');
  if (explicitLocale) {
    return normalizeSupportedLocale(explicitLocale);
  }

  return resolveLocaleFromAcceptLanguage(request.header('accept-language'));
}

export function attachRequestLocale(request: LocaleRequest): SupportedLocale {
  const locale = request.locale ?? resolveRequestLocale(request);
  request.locale = locale;
  return locale;
}

export function getRequestLocale(request: Request): SupportedLocale {
  return (request as LocaleRequest).locale ?? resolveRequestLocale(request);
}
