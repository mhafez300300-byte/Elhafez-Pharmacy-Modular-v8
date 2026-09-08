import { auditEventHash } from '../domain/audit-chain.js';
export class PostgresAuditRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async append(input, tx) {
        await tx.query(`INSERT INTO audit_heads(tenant_id,last_event_id,last_hash) VALUES($1,NULL,NULL) ON CONFLICT(tenant_id) DO NOTHING`, [input.tenantId]);
        const head = (await tx.query(`SELECT last_hash as "lastHash" FROM audit_heads WHERE tenant_id=$1 FOR UPDATE`, [input.tenantId])).rows[0];
        const createdAt = new Date().toISOString(), prevHash = head?.lastHash ?? null, eventHash = auditEventHash({ ...input, userId: input.userId ?? null, entityId: input.entityId ?? null, detail: input.detail ?? {}, createdAt, prevHash });
        const q = await tx.query(`INSERT INTO audit_events(tenant_id,user_id,action,entity,entity_id,detail,created_at,prev_hash,event_hash) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9) RETURNING id`, [input.tenantId, input.userId ?? null, input.action, input.entity, input.entityId ?? null, JSON.stringify(input.detail ?? {}), createdAt, prevHash, eventHash]);
        await tx.query(`UPDATE audit_heads SET last_event_id=$2,last_hash=$3,updated_at=now() WHERE tenant_id=$1`, [input.tenantId, q.rows[0].id, eventHash]);
    }
    async record(input, tx) { if (tx)
        return this.append(input, tx); await this.db.withTransaction(async (inner) => this.append(input, inner)); }
    async list(tenantId, limit = 200) { return (await this.db.query(`SELECT id,user_id as "userId",action,entity,entity_id as "entityId",detail,event_hash as "eventHash",created_at as "createdAt" FROM audit_events WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT $2`, [tenantId, Math.min(1000, Math.max(1, limit))])).rows; }
    async verifyChain(tenantId) {
        const rows = (await this.db.query(`SELECT id,user_id as "userId",action,entity,entity_id as "entityId",detail,created_at::text as "createdAt",prev_hash as "prevHash",event_hash as "eventHash" FROM audit_events WHERE tenant_id=$1 ORDER BY id`, [tenantId])).rows;
        let prev = null, checked = 0, unhashed = 0, firstBrokenId = null;
        for (const r of rows) {
            if (!r.eventHash) {
                unhashed++;
                continue;
            }
            const expected = auditEventHash({ tenantId, userId: r.userId, action: r.action, entity: r.entity, entityId: r.entityId, detail: r.detail, createdAt: r.createdAt, prevHash: prev });
            if (r.prevHash !== prev || r.eventHash !== expected) {
                firstBrokenId = Number(r.id);
                break;
            }
            prev = r.eventHash;
            checked++;
        }
        const head = (await this.db.query(`SELECT last_hash as "lastHash" FROM audit_heads WHERE tenant_id=$1`, [tenantId])).rows[0]?.lastHash ?? null;
        const legacyOnly = checked === 0 && unhashed === rows.length;
        const ok = firstBrokenId === null && (legacyOnly ? true : head === prev);
        return { ok, checked, unhashed, firstBrokenId, headHash: head, legacyEvents: unhashed, status: legacyOnly ? 'legacy_unsealed' : ok ? 'healthy' : 'broken' };
    }
}
