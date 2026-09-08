const projection = `id,tenant_id as "tenantId",name,barcode,sku,selling_price::float as "sellingPrice",cost_price::float as "costPrice",tax_rate::float as "taxRate",reorder_level::float as "reorderLevel",requires_prescription as "requiresPrescription",controlled_class as "controlledClass",active`;
export class PostgresCatalogRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    ex(tx) { return tx ?? this.db; }
    async create(input, tx) { const q = await this.ex(tx).query(`INSERT INTO cat_products(id,tenant_id,name,barcode,sku,selling_price,cost_price,tax_rate,reorder_level,requires_prescription,controlled_class,active) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING ${projection}`, [input.id, input.tenantId, input.name, input.barcode, input.sku, input.sellingPrice, input.costPrice, input.taxRate, input.reorderLevel, input.requiresPrescription, input.controlledClass, input.active]); return q.rows[0]; }
    async get(t, id, tx) { return (await this.ex(tx).query(`SELECT ${projection} FROM cat_products WHERE tenant_id=$1 AND id=$2`, [t, id])).rows[0] ?? null; }
    async findByBarcode(t, b, tx) { return (await this.ex(tx).query(`SELECT ${projection} FROM cat_products WHERE tenant_id=$1 AND barcode=$2`, [t, b])).rows[0] ?? null; }
    async updateSellingPrice(t, id, p, tx) { await tx.query(`UPDATE cat_products SET selling_price=$3,updated_at=now() WHERE tenant_id=$1 AND id=$2`, [t, id, p]); }
    async listActiveForPlanning(t) { return (await this.db.query(`SELECT ${projection} FROM cat_products WHERE tenant_id=$1 AND active=true ORDER BY name`, [t])).rows; }
    async list(t, query = '', limit = 100) { const x = query.trim().toLowerCase(), like = `%${x}%`, prefix = `${x}%`, n = Math.min(500, Math.max(1, limit)); return (await this.db.query(`SELECT ${projection} FROM cat_products WHERE tenant_id=$1 AND active=true AND ($2='' OR barcode=$2 OR lower(coalesce(sku,''))=$2 OR lower(name) LIKE $3 OR lower(name) LIKE $4 OR lower(coalesce(barcode,'')) LIKE $4 OR lower(coalesce(sku,'')) LIKE $4) ORDER BY CASE WHEN barcode=$2 OR lower(coalesce(sku,''))=$2 THEN 0 WHEN lower(name) LIKE $3 THEN 1 ELSE 2 END,name LIMIT $5`, [t, x, prefix, like, n])).rows; }
}
