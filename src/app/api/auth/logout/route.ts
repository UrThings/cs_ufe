import { AUTH_COOKIE_NAME, authCookieOptions } from "@/lib/auth/constants";
import { successResponse } from "@/lib/api-response";

export async function POST() {
  const response = successResponse({ success: true }, "Logged out successfully.");

  response.cookies.set(AUTH_COOKIE_NAME, "", {
    ...authCookieOptions,
    maxAge: 0,
  });

  return response;
}
