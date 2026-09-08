const projection = `id,tenant_id as "tenantId",branch_id as "branchId",product_id as "productId",free_text as "freeText",quantity::float,customer_id as "customerId",customer_name as "customerName",customer_phone as "customerPhone",reason,note,status,source,created_by as "createdBy",created_at::text as "createdAt",updated_at::text as "updatedAt"`;
export class PostgresShortageRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    ex(tx) { return tx ?? this.db; }
    async create(v, tx) { return (await this.ex(tx).query(`INSERT INTO ops_shortages(id,tenant_id,branch_id,product_id,free_text,quantity,customer_id,customer_name,customer_phone,reason,note,status,source,created_by,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING ${projection}`, [v.id, v.tenantId, v.branchId, v.productId, v.freeText, v.quantity, v.customerId, v.customerName, v.customerPhone, v.reason, v.note, v.status, v.source, v.createdBy, v.createdAt, v.updatedAt])).rows[0]; }
    async get(t, id, tx) { return (await this.ex(tx).query(`SELECT ${projection} FROM ops_shortages WHERE tenant_id=$1 AND id=$2`, [t, id])).rows[0] ?? null; }
    async list(t, b, s, limit = 200) { return (await this.db.query(`SELECT ${projection} FROM ops_shortages WHERE tenant_id=$1 AND ($2::text IS NULL OR branch_id=$2) AND ($3::text IS NULL OR status=$3) ORDER BY created_at DESC LIMIT $4`, [t, b ?? null, s ?? null, Math.min(500, Math.max(1, limit))])).rows; }
    async updateStatus(t, id, status, tx) { return (await this.ex(tx).query(`UPDATE ops_shortages SET status=$3,updated_at=now() WHERE tenant_id=$1 AND id=$2 RETURNING ${projection}`, [t, id, status])).rows[0]; }
}
