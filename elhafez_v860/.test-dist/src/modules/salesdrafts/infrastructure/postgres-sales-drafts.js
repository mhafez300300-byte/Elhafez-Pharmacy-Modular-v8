const view = (r) => ({ id: r.id, tenantId: r.tenant_id, branchId: r.branch_id, userId: r.user_id, label: r.label, customerId: r.customer_id, payment: r.payment, invoiceDiscount: Number(r.invoice_discount), loyaltyPointsToRedeem: Number(r.loyalty_points_to_redeem), lines: Array.isArray(r.lines) ? r.lines : [], createdAt: new Date(r.created_at).toISOString(), updatedAt: new Date(r.updated_at).toISOString() });
export class PostgresSalesDraftRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async save(i, tx) { const q = tx ?? this.db, r = await q.query(`INSERT INTO draft_sales_carts(id,tenant_id,branch_id,user_id,label,customer_id,payment,invoice_discount,loyalty_points_to_redeem,lines,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12) ON CONFLICT(id) DO UPDATE SET branch_id=EXCLUDED.branch_id,user_id=EXCLUDED.user_id,label=EXCLUDED.label,customer_id=EXCLUDED.customer_id,payment=EXCLUDED.payment,invoice_discount=EXCLUDED.invoice_discount,loyalty_points_to_redeem=EXCLUDED.loyalty_points_to_redeem,lines=EXCLUDED.lines,updated_at=EXCLUDED.updated_at WHERE draft_sales_carts.tenant_id=EXCLUDED.tenant_id RETURNING *`, [i.id, i.tenantId, i.branchId, i.userId, i.label, i.customerId, i.payment, i.invoiceDiscount, i.loyaltyPointsToRedeem, JSON.stringify(i.lines), i.createdAt, i.updatedAt]); return view(r.rows[0]); }
    async get(t, id) { const r = await this.db.query('SELECT * FROM draft_sales_carts WHERE tenant_id=$1 AND id=$2', [t, id]); return r.rows[0] ? view(r.rows[0]) : null; }
    async list(t, b) { const r = await this.db.query(`SELECT * FROM draft_sales_carts WHERE tenant_id=$1 ${b ? 'AND branch_id=$2' : ''} ORDER BY updated_at DESC LIMIT 100`, b ? [t, b] : [t]); return r.rows.map(view); }
    async delete(t, id, tx) { const r = await (tx ?? this.db).query('DELETE FROM draft_sales_carts WHERE tenant_id=$1 AND id=$2', [t, id]); return Number(r.rowCount ?? 0) > 0; }
}
