import { NextResponse } from "next/server";
import {
  ADMIN_LOCALE_COOKIE,
  ADMIN_PREFERENCE_COOKIE_MAX_AGE,
  normalizeAdminLocale,
} from "@/src/lib/preferences";

export async function POST(request: Request) {
  const formData = await request.formData();
  const locale = normalizeAdminLocale(String(formData.get("locale") ?? ""));
  const response = NextResponse.json(
    { ok: true, locale },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
  response.cookies.set(ADMIN_LOCALE_COOKIE, locale, {
    path: "/",
    sameSite: "lax",
    maxAge: ADMIN_PREFERENCE_COOKIE_MAX_AGE,
  });
  return response;
}
