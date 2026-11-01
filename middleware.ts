import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js Edge Middleware
 * Protects administrative and restricted routes before any client rendering occurs.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Guard /admin routes
  if (pathname.startsWith("/admin")) {
    const roleCookie = request.cookies.get("speakflow_role")?.value;
    const sessionCookie =
      request.cookies.get("sb-access-token")?.value ||
      request.cookies.get("sb-auth-token")?.value ||
      request.cookies.get("supabase-auth-token")?.value;

    // If client explicitly sets a non-admin role in cookies, redirect to login
    if (roleCookie && roleCookie !== "admin") {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("error", "unauthorized_admin");
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
