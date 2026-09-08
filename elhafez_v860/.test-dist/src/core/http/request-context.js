import { readSignedToken } from '../security/token.js';
function cookieValue(raw, name) { if (!raw)
    return undefined; for (const part of raw.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name)
        return decodeURIComponent(value.join('='));
} return undefined; }
export function authContext(appSecret) { return (req, _res, next) => { const bearer = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : undefined; const token = bearer ?? cookieValue(req.headers.cookie, 'elhafez_session'); if (token) {
    const claims = readSignedToken(token, appSecret);
    if (claims)
        req.auth = { userId: claims.uid, tenantId: claims.tenantId, sessionId: claims.sid };
} next(); }; }
