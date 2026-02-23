import jwt, { type JwtPayload } from "jsonwebtoken";
import { env } from "@/config/environment";
import {
  AUTH_AUDIENCE,
  AUTH_ISSUER,
  AUTH_TOKEN_TTL,
} from "@/lib/auth/constants";

export type AuthRole = "MEMBER" | "ADMIN";

export type AuthTokenClaims = JwtPayload & {
  sub: string;
  email: string;
  role: AuthRole;
};

type AuthTokenInput = {
  userId: number;
  email: string;
  role: AuthRole;
};

function isAuthRole(value: unknown): value is AuthRole {
  return value === "MEMBER" || value === "ADMIN";
}

export function signAuthToken(input: AuthTokenInput) {
  return jwt.sign(
    {
      sub: String(input.userId),
      email: input.email,
      role: input.role,
    },
    env.accessTokenSecret,
    {
      expiresIn: AUTH_TOKEN_TTL,
      audience: AUTH_AUDIENCE,
      issuer: AUTH_ISSUER,
    },
  );
}

export function verifyAuthToken(token: string): AuthTokenClaims | null {
  try {
    const decoded = jwt.verify(token, env.accessTokenSecret, {
      audience: AUTH_AUDIENCE,
      issuer: AUTH_ISSUER,
    });

    if (typeof decoded === "string") {
      return null;
    }

    if (typeof decoded.sub !== "string") {
      return null;
    }

    if (typeof decoded.email !== "string") {
      return null;
    }

    if (!isAuthRole(decoded.role)) {
      return null;
    }

    return decoded as AuthTokenClaims;
  } catch {
    return null;
  }
}
