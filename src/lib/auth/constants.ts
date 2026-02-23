import { isProd } from "@/config/environment";

export const AUTH_COOKIE_NAME = "auth_token";
export const AUTH_AUDIENCE = "authenticated-users";
export const AUTH_ISSUER = "cs-ufe-api";
export const AUTH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
export const AUTH_TOKEN_TTL = `${AUTH_TOKEN_MAX_AGE_SECONDS}s`;

export const authCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: isProd,
  path: "/",
  maxAge: AUTH_TOKEN_MAX_AGE_SECONDS,
} as const;
