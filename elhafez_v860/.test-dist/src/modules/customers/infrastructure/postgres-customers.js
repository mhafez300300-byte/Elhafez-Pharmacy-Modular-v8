export class PostgresCustomerRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    ex(tx) { return tx ?? this.db; }
    async create(i, tx) { return (await this.ex(tx).query(`INSERT INTO crm_customers(id,tenant_id,name,phone,credit_limit,active) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,tenant_id as "tenantId",name,phone,credit_limit::float as "creditLimit",active`, [i.id, i.tenantId, i.name, i.phone, i.creditLimit, i.active])).rows[0]; }
    async get(t, id, tx) { return (await this.ex(tx).query(`SELECT id,tenant_id as "tenantId",name,phone,credit_limit::float as "creditLimit",active FROM crm_customers WHERE tenant_id=$1 AND id=$2`, [t, id])).rows[0] ?? null; }
    async list(t, q = '') { return (await this.db.query(`SELECT id,tenant_id as "tenantId",name,phone,credit_limit::float as "creditLimit",active FROM crm_customers WHERE tenant_id=$1 AND ($2='' OR lower(name) LIKE $3 OR lower(coalesce(phone,'')) LIKE $3) ORDER BY name LIMIT 300`, [t, q, `%${q.toLowerCase()}%`])).rows; }
}
