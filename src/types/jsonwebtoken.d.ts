declare module "jsonwebtoken" {
  export interface JwtPayload {
    [key: string]: unknown;
    exp?: number;
    iat?: number;
    sub?: string;
    iss?: string;
    aud?: string | string[];
  }

  export interface SignOptions {
    expiresIn?: string | number;
    issuer?: string;
    audience?: string | string[];
  }

  export function sign(
    payload: string | Buffer | object,
    secretOrPrivateKey: string,
    options?: SignOptions,
  ): string;

  export function verify(
    token: string,
    secretOrPublicKey: string,
    options?: {
      issuer?: string;
      audience?: string | string[];
    },
  ): string | JwtPayload;

  const jwt: {
    sign: typeof sign;
    verify: typeof verify;
  };

  export default jwt;
}
