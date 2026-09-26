import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { locales, defaultLocale, isValidLocale } from "@/i18n/config";

const PUBLIC_FILE = /\.(.*)$/;
const LOCALE_REGEX = new RegExp(`^/(${locales.join("|")})(/|$)`);

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip static files, api routes, and already localized paths
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    PUBLIC_FILE.test(pathname) ||
    LOCALE_REGEX.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Redirect to default locale
  const locale = defaultLocale;
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.ico$).*)",
  ],
};