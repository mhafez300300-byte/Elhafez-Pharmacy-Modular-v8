const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
export class PostgresPricingRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    ex(tx) { return tx ?? this.db; }
    async createOffer(v, tx) { const q = await this.ex(tx).query(`INSERT INTO pr_offers(id,tenant_id,name,product_id,kind,value,min_qty,starts_at,ends_at,active) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id,tenant_id as "tenantId",name,product_id as "productId",kind,value::float,min_qty::float as "minQty",starts_at::text as "startsAt",ends_at::text as "endsAt",active`, [v.id, v.tenantId, v.name, v.productId, v.kind, v.value, v.minQty, v.startsAt, v.endsAt, v.active]); return q.rows[0]; }
    async listOffers(t, activeOnly = false) { return (await this.db.query(`SELECT id,tenant_id as "tenantId",name,product_id as "productId",kind,value::float,min_qty::float as "minQty",starts_at::text as "startsAt",ends_at::text as "endsAt",active FROM pr_offers WHERE tenant_id=$1 AND ($2=false OR (active=true AND starts_at<=now() AND (ends_at IS NULL OR ends_at>now()))) ORDER BY created_at DESC`, [t, activeOnly])).rows; }
    async calculateDiscount(t, p, q, u, at = new Date(), tx) { const x = await this.ex(tx).query(`SELECT id,kind,value::float FROM pr_offers WHERE tenant_id=$1 AND active=true AND (product_id IS NULL OR product_id=$2) AND min_qty<=$3 AND starts_at<=$4 AND (ends_at IS NULL OR ends_at>$4) ORDER BY CASE WHEN product_id=$2 THEN 0 ELSE 1 END,created_at DESC`, [t, p, q, at.toISOString()]); let best = { amount: 0, offerId: null }; const gross = u * q; for (const o of x.rows) {
        const amt = round2(Math.min(gross, o.kind === 'percent' ? gross * (o.value / 100) : o.value * q));
        if (amt > best.amount)
            best = { amount: amt, offerId: o.id };
    } return best; }
    async createPriceUpdate(v, tx) { const q = await this.ex(tx).query(`INSERT INTO pr_price_updates(id,tenant_id,product_id,old_price,new_price,source,note,status,created_at,applied_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id,tenant_id as "tenantId",product_id as "productId",old_price::float as "oldPrice",new_price::float as "newPrice",source,note,status,created_at::text as "createdAt",applied_at::text as "appliedAt"`, [v.id, v.tenantId, v.productId, v.oldPrice, v.newPrice, v.source, v.note, v.status, v.createdAt, v.appliedAt]); return q.rows[0]; }
    async getPriceUpdate(t, id, tx) { const q = await this.ex(tx).query(`SELECT id,tenant_id as "tenantId",product_id as "productId",old_price::float as "oldPrice",new_price::float as "newPrice",source,note,status,created_at::text as "createdAt",applied_at::text as "appliedAt" FROM pr_price_updates WHERE tenant_id=$1 AND id=$2`, [t, id]); return q.rows[0] ?? null; }
    async markApplied(t, id, tx) { await tx.query(`UPDATE pr_price_updates SET status='applied',applied_at=now() WHERE tenant_id=$1 AND id=$2 AND status='pending'`, [t, id]); }
    async listPriceUpdates(t, status) { return (await this.db.query(`SELECT id,tenant_id as "tenantId",product_id as "productId",old_price::float as "oldPrice",new_price::float as "newPrice",source,note,status,created_at::text as "createdAt",applied_at::text as "appliedAt" FROM pr_price_updates WHERE tenant_id=$1 AND ($2::text IS NULL OR status=$2) ORDER BY created_at DESC`, [t, status ?? null])).rows; }
}
