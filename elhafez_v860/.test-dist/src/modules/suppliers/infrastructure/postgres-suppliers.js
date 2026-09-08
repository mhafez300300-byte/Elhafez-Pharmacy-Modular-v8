export class PostgresSupplierRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    ex(tx) { return tx ?? this.db; }
    async create(i, tx) { return (await this.ex(tx).query(`INSERT INTO crm_suppliers(id,tenant_id,name,phone,active) VALUES($1,$2,$3,$4,$5) RETURNING id,tenant_id as "tenantId",name,phone,active`, [i.id, i.tenantId, i.name, i.phone, i.active])).rows[0]; }
    async get(t, id, tx) { return (await this.ex(tx).query(`SELECT id,tenant_id as "tenantId",name,phone,active FROM crm_suppliers WHERE tenant_id=$1 AND id=$2`, [t, id])).rows[0] ?? null; }
    async list(t, q = '') { return (await this.db.query(`SELECT id,tenant_id as "tenantId",name,phone,active FROM crm_suppliers WHERE tenant_id=$1 AND ($2='' OR lower(name) LIKE $3 OR lower(coalesce(phone,'')) LIKE $3) ORDER BY name LIMIT 300`, [t, q, `%${q.toLowerCase()}%`])).rows; }
}
