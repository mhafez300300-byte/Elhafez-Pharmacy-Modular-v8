import { createHash } from 'node:crypto';
function stable(value) { if (Array.isArray(value))
    return value.map(stable); if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, stable(v)])); return value; }
export function auditEventHash(input) { return createHash('sha256').update(JSON.stringify(stable({ tenantId: input.tenantId, userId: input.userId ?? null, action: input.action, entity: input.entity, entityId: input.entityId ?? null, detail: input.detail ?? {}, createdAt: input.createdAt, prevHash: input.prevHash ?? null }))).digest('hex'); }
