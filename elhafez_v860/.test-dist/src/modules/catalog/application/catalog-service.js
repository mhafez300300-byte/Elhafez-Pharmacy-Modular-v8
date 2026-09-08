import { newId } from '../../../core/types/id.js';
import { validateProduct } from '../domain/product.js';
export class CatalogService {
    catalog;
    audit;
    constructor(catalog, audit) {
        this.catalog = catalog;
        this.audit = audit;
    }
    async create(tenantId, userId, input) { const p = validateProduct(input); const created = await this.catalog.create({ id: newId('prd'), tenantId, name: p.name, barcode: p.barcode ?? null, sku: p.sku ?? null, sellingPrice: p.sellingPrice, costPrice: p.costPrice, taxRate: p.taxRate, reorderLevel: p.reorderLevel, requiresPrescription: p.requiresPrescription, controlledClass: p.controlledClass, active: p.active }); await this.audit.record({ tenantId, userId, action: 'product.created', entity: 'product', entityId: created.id, detail: { name: created.name } }); return created; }
}
