import { NextRequest, NextResponse } from "next/server";
import { env } from "@/config/environment";
import { verifyEdgeToken } from "@/lib/auth/edge-token";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";

const ADMIN_MATCHER = ["/admin", "/api/admin"];
const PUBLIC_ADMIN_PATHS = new Set(["/admin", "/admin/login"]);

function isAdminRoute(pathname: string) {
  return ADMIN_MATCHER.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function unauthorizedResponse(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { success: false, message: "Unauthorized." },
      { status: 401 },
    );
  }

  const loginPath = request.nextUrl.pathname.startsWith("/admin/")
    ? "/admin/login"
    : "/auth/login";
  const redirectUrl = new URL(loginPath, request.url);
  redirectUrl.searchParams.set("redirect", request.nextUrl.pathname);
  return NextResponse.redirect(redirectUrl);
}

function forbiddenResponse(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { success: false, message: "Forbidden." },
      { status: 403 },
    );
  }

  if (request.nextUrl.pathname.startsWith("/admin/")) {
    const redirectUrl = new URL("/admin/login", request.url);
    redirectUrl.searchParams.set("error", "forbidden");
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.redirect(new URL("/", request.url));
}

export async function middleware(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return NextResponse.next();
  }

  if (PUBLIC_ADMIN_PATHS.has(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return unauthorizedResponse(request);
  }

  const payload = await verifyEdgeToken(token, env.accessTokenSecret);

  if (!payload) {
    return unauthorizedResponse(request);
  }

  if (isAdminRoute(request.nextUrl.pathname) && payload.role !== "ADMIN") {
    return forbiddenResponse(request);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", payload.sub);
  requestHeaders.set("x-user-email", payload.email);
  requestHeaders.set("x-user-role", payload.role);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/team/:path*",
    "/admin/:path*",
    "/api/protected/:path*",
    "/api/admin/:path*",
    "/api/teams/:path*",
    "/api/tournaments/:path*",
  ],
};
