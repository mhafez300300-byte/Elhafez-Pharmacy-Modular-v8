export class PostgresClinicalRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    ex(tx) { return tx ?? this.db; }
    async createDoctor(v, tx) { const q = await this.ex(tx).query(`INSERT INTO ph_doctors(id,tenant_id,name,phone,specialty,active) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,tenant_id as "tenantId",name,phone,specialty,active`, [v.id, v.tenantId, v.name, v.phone, v.specialty, v.active]); return q.rows[0]; }
    async listDoctors(t) { return (await this.db.query(`SELECT id,tenant_id as "tenantId",name,phone,specialty,active FROM ph_doctors WHERE tenant_id=$1 ORDER BY name`, [t])).rows; }
    async createPrescription(v, tx) { const ex = this.ex(tx); await ex.query(`INSERT INTO ph_prescriptions(id,tenant_id,customer_id,doctor_id,code,issued_at,expires_at,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [v.id, v.tenantId, v.customerId, v.doctorId, v.code, v.issuedAt, v.expiresAt, v.status]); for (const l of v.lines)
        await ex.query(`INSERT INTO ph_prescription_lines(id,prescription_id,product_id,quantity,dose) VALUES($1,$2,$3,$4,$5)`, [l.id, v.id, l.productId, l.quantity, l.dose]); return v; }
    async getPrescription(t, id, tx) { const q = await this.ex(tx).query(`SELECT p.*,COALESCE(json_agg(json_build_object('id',l.id,'productId',l.product_id,'quantity',l.quantity::float,'dose',l.dose)) FILTER(WHERE l.id IS NOT NULL),'[]'::json) lines FROM ph_prescriptions p LEFT JOIN ph_prescription_lines l ON l.prescription_id=p.id WHERE p.tenant_id=$1 AND p.id=$2 GROUP BY p.id`, [t, id]); return q.rows[0] ? this.mapPrescription(q.rows[0]) : null; }
    async listPrescriptions(t, limit = 100) { const q = await this.db.query(`SELECT p.*,COALESCE(json_agg(json_build_object('id',l.id,'productId',l.product_id,'quantity',l.quantity::float,'dose',l.dose)) FILTER(WHERE l.id IS NOT NULL),'[]'::json) lines FROM ph_prescriptions p LEFT JOIN ph_prescription_lines l ON l.prescription_id=p.id WHERE p.tenant_id=$1 GROUP BY p.id ORDER BY p.issued_at DESC LIMIT $2`, [t, Math.min(500, limit)]); return q.rows.map((x) => this.mapPrescription(x)); }
    async createRecall(v, tx) { const q = await this.ex(tx).query(`INSERT INTO ph_recalls(id,tenant_id,product_id,batch_no,reason,severity,active,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,tenant_id as "tenantId",product_id as "productId",batch_no as "batchNo",reason,severity,active,created_at::text as "createdAt"`, [v.id, v.tenantId, v.productId, v.batchNo, v.reason, v.severity, v.active, v.createdAt]); return q.rows[0]; }
    async listRecalls(t, activeOnly = false) { return (await this.db.query(`SELECT id,tenant_id as "tenantId",product_id as "productId",batch_no as "batchNo",reason,severity,active,created_at::text as "createdAt" FROM ph_recalls WHERE tenant_id=$1 AND ($2=false OR active=true) ORDER BY created_at DESC`, [t, activeOnly])).rows; }
    async createInteraction(i, tx) { await this.ex(tx).query(`INSERT INTO ph_interactions(id,tenant_id,product_a,product_b,severity,message) VALUES($1,$2,$3,$4,$5,$6)`, [i.id, i.tenantId, i.productA, i.productB, i.severity, i.message]); }
    async safetyCheck(t, items, tx) { const ex = this.ex(tx), ids = [...new Set(items.map(x => x.productId))]; if (!ids.length)
        return { blocked: false, warnings: [] }; const recalls = await ex.query(`SELECT product_id,batch_no,reason,severity FROM ph_recalls WHERE tenant_id=$1 AND active=true AND product_id=ANY($2::text[])`, [t, ids]); const warnings = []; for (const r of recalls.rows) {
        const item = items.find(x => x.productId === r.product_id);
        if (r.batch_no && !(item?.batchNos ?? []).includes(r.batch_no))
            continue;
        warnings.push({ type: 'recall', severity: r.severity, message: `سحب دوائي: ${r.reason}`, productIds: [r.product_id] });
    } const ints = await ex.query(`SELECT product_a,product_b,severity,message FROM ph_interactions WHERE tenant_id=$1 AND active=true AND product_a=ANY($2::text[]) AND product_b=ANY($2::text[])`, [t, ids]); for (const x of ints.rows)
        warnings.push({ type: 'interaction', severity: x.severity, message: x.message, productIds: [x.product_a, x.product_b] }); return { blocked: warnings.some(x => x.severity === 'block'), warnings }; }
    mapPrescription(x) { return { id: x.id, tenantId: x.tenant_id, customerId: x.customer_id ?? null, doctorId: x.doctor_id ?? null, code: x.code, issuedAt: new Date(x.issued_at).toISOString(), expiresAt: x.expires_at ? new Date(x.expires_at).toISOString() : null, status: x.status, lines: x.lines ?? [] }; }
}
