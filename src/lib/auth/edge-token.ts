import type { AuthTokenClaims } from "@/lib/auth/token";

function base64UrlToUint8Array(input: string) {
  let base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = base64.length % 4;

  if (padding > 0) {
    base64 += "=".repeat(4 - padding);
  }

  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);

  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }

  return bytes;
}

function parseTokenPayload(payloadSegment: string): AuthTokenClaims | null {
  try {
    const json = new TextDecoder().decode(base64UrlToUint8Array(payloadSegment));
    const payload = JSON.parse(json) as Partial<AuthTokenClaims>;

    if (typeof payload.sub !== "string") {
      return null;
    }

    if (typeof payload.email !== "string") {
      return null;
    }

    if (payload.role !== "ADMIN" && payload.role !== "MEMBER") {
      return null;
    }

    if (typeof payload.exp !== "number") {
      return null;
    }

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload as AuthTokenClaims;
  } catch {
    return null;
  }
}

export async function verifyEdgeToken(
  token: string,
  secret: string,
): Promise<AuthTokenClaims | null> {
  const segments = token.split(".");
  if (segments.length !== 3) {
    return null;
  }

  const [headerSegment, payloadSegment, signatureSegment] = segments;
  let header: { alg?: string; typ?: string };

  try {
    const headerJson = new TextDecoder().decode(base64UrlToUint8Array(headerSegment));
    header = JSON.parse(headerJson) as { alg?: string; typ?: string };
  } catch {
    return null;
  }

  if (header.alg !== "HS256" || header.typ !== "JWT") {
    return null;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const payload = new TextEncoder().encode(`${headerSegment}.${payloadSegment}`);
  const signature = base64UrlToUint8Array(signatureSegment);
  const isValid = await crypto.subtle.verify("HMAC", key, signature, payload);

  if (!isValid) {
    return null;
  }

  return parseTokenPayload(payloadSegment);
}
