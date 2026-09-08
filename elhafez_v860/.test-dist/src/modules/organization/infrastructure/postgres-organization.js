export class PostgresOrganizationRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    exec(tx) { return tx ?? this.db; }
    async getTenant(tenantId, tx) {
        const q = await this.exec(tx).query('SELECT id,name,status,currency FROM org_tenants WHERE id=$1', [tenantId]);
        return q.rows[0] ?? null;
    }
    async getDefaultBranch(tenantId, tx) {
        const q = await this.exec(tx).query('SELECT id,tenant_id as "tenantId",name,active FROM org_branches WHERE tenant_id=$1 AND active=true ORDER BY created_at LIMIT 1', [tenantId]);
        return q.rows[0] ?? null;
    }
    async createTenantWithBranch(input, tx) {
        const t = await tx.query(`INSERT INTO org_tenants(id,name,status,currency) VALUES($1,$2,'trial',$3) RETURNING id,name,status,currency`, [input.tenantId, input.name, input.currency]);
        const b = await tx.query(`INSERT INTO org_branches(id,tenant_id,name,active) VALUES($1,$2,$3,true) RETURNING id,tenant_id as "tenantId",name,active`, [input.branchId, input.tenantId, input.branchName]);
        return { tenant: t.rows[0], branch: b.rows[0] };
    }
    async listBranches(tenantId) {
        return (await this.db.query('SELECT id,tenant_id as "tenantId",name,active FROM org_branches WHERE tenant_id=$1 ORDER BY created_at', [tenantId])).rows;
    }
    async createBranch(input, tx) { const ex = tx ?? this.db; const q = await ex.query(`INSERT INTO org_branches(id,tenant_id,name,active) VALUES($1,$2,$3,true) RETURNING id,tenant_id as "tenantId",name,active`, [input.id, input.tenantId, input.name]); return q.rows[0]; }
    async listActiveTenantBranches() { return (await this.db.query(`SELECT b.tenant_id as "tenantId",b.id as "branchId" FROM org_branches b JOIN org_tenants t ON t.id=b.tenant_id WHERE b.active=true AND t.status IN('trial','active') ORDER BY b.tenant_id,b.created_at`)).rows; }
}
