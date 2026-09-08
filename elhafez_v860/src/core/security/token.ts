import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

const b64url = (value: string | any) => Buffer.from(value).toString('base64url');

export type SessionTokenClaims = Readonly<{ sid: string; uid: string; tenantId: string; exp: number }>;

export function issueSignedToken(claims: Omit<SessionTokenClaims, 'sid'> & {sid?:string}, secret: string): string {
  const payload: SessionTokenClaims = { sid: claims.sid??randomUUID(), uid:claims.uid,tenantId:claims.tenantId,exp:claims.exp };
  const encoded = b64url(JSON.stringify(payload));
  const sig = createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function readSignedToken(token: string, secret: string): SessionTokenClaims | null {
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;
  const expected = createHmac('sha256', secret).update(encoded).digest('base64url');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const claims = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SessionTokenClaims;
    if (!claims.sid || !claims.uid || !claims.tenantId || claims.exp <= Date.now()) return null;
    return claims;
  } catch {
    return null;
  }
}
