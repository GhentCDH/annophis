import { SignJWT, jwtVerify } from 'jose';
import type { JWTPayload } from 'jose';

export const INTERNAL_JWT_ISSUER = 'annophis-gateway';
/** Header carrying the gateway-issued token; `Authorization` stays free for crouton's session token. */
export const INTERNAL_TOKEN_HEADER = 'x-internal-token';

export type InternalUser = { id: string; email?: string; roles: string[] };

/**
 * Short-lived HS256 token the gateway attaches when it forwards a user's request to a service:
 * iss annophis-gateway, aud <service>, sub = user id, plus roles and email. Verified by ServiceAuthGuard.
 */
export const signInternalToken = (
  user: InternalUser,
  audience: string,
  secret: string,
  ttl: string | number = '60s',
) =>
  new SignJWT({ roles: user.roles, ...(user.email ? { email: user.email } : {}) })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(INTERNAL_JWT_ISSUER)
    .setAudience(audience)
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(new TextEncoder().encode(secret));

/**
 * Verifies the gateway-issued internal token for `audience` (the service's SERVICE_NAME) and returns its claims.
 * Throws when the signature, issuer, audience, algorithm or expiry is wrong.
 */
export const verifyInternalToken = async (token: string, audience: string, secret: string): Promise<JWTPayload> => {
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
    issuer: INTERNAL_JWT_ISSUER,
    audience,
    algorithms: ['HS256'],
  });
  return payload;
};
