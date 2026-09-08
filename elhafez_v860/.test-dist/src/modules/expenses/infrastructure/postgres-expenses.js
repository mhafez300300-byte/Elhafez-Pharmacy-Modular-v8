export class PostgresExpenseRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async save(v, tx) { await tx.query(`INSERT INTO exp_expenses(id,tenant_id,branch_id,user_id,category,description,amount,method,occurred_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [v.id, v.tenantId, v.branchId, v.userId, v.category, v.description, v.amount, v.method, v.occurredAt]); }
    async list(t, limit = 200) { const q = await this.db.query(`SELECT id,tenant_id as "tenantId",branch_id as "branchId",user_id as "userId",category,description,amount::float,method,occurred_at::text as "occurredAt" FROM exp_expenses WHERE tenant_id=$1 ORDER BY occurred_at DESC LIMIT $2`, [t, Math.min(500, limit)]); return q.rows; }
}
