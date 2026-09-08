import { createHash } from 'node:crypto';
function stable(value) {
    if (Array.isArray(value))
        return value.map(stable);
    if (value && typeof value === 'object')
        return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, stable(v)]));
    return value;
}
export function requestFingerprint(value) { return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex'); }
