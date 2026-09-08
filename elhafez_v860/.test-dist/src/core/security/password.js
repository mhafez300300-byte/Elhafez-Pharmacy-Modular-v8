import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { AppError } from '../errors/app-error.js';
export function hashSecret(secret) {
    if (secret.length < 4)
        throw new AppError('CREDENTIAL_TOO_SHORT', 'Credential is too short', 422);
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(secret, salt, 64).toString('hex');
    return `scrypt$${salt}$${hash}`;
}
export function verifySecret(secret, stored) {
    const [scheme, salt, expected] = stored.split('$');
    if (scheme !== 'scrypt' || !salt || !expected)
        return false;
    const actual = scryptSync(secret, salt, 64);
    const expectedBuffer = Buffer.from(expected, 'hex');
    return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}
