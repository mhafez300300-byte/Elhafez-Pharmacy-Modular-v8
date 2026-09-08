export class PostgresPlatformRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async saveActivation(input, tx) {
        await tx.query(`INSERT INTO platform_activation(tenant_id,company_code,mode,status,plan,expires_at,features) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)`, [input.tenantId, input.companyCode, input.mode, input.status, input.plan, input.expiresAt, JSON.stringify(input.features)]);
    }
}
