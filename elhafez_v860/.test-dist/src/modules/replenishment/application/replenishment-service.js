import { calculateReorder } from '../domain/reorder-policy.js';
export class ReplenishmentService {
    catalog;
    inventory;
    sales;
    constructor(catalog, inventory, sales) {
        this.catalog = catalog;
        this.inventory = inventory;
        this.sales = sales;
    }
    async recommendations(tenantId, branchId, targetDays = 21) {
        const [products, balances, demand7, demand30] = await Promise.all([
            this.catalog.listActiveForPlanning(tenantId),
            this.inventory.balances(tenantId, branchId),
            this.sales.demandSummary(tenantId, branchId, 7),
            this.sales.demandSummary(tenantId, branchId, 30),
        ]);
        const stock = new Map(balances.map(x => [x.productId, x.quantity]));
        const d7 = new Map(demand7.map(x => [x.productId, x.netQuantity]));
        const d30 = new Map(demand30.map(x => [x.productId, x.netQuantity]));
        const items = products.filter(p => p.active).map(product => {
            const currentStock = stock.get(product.id) ?? 0;
            const sold7 = d7.get(product.id) ?? 0;
            const sold30 = d30.get(product.id) ?? 0;
            const decision = calculateReorder({ currentStock, reorderLevel: product.reorderLevel, net7: sold7, net30: sold30, targetDays });
            return {
                productId: product.id,
                productName: product.name,
                barcode: product.barcode,
                currentStock,
                reorderLevel: product.reorderLevel,
                sold7,
                sold30,
                ...decision,
            };
        });
        const rank = { critical: 0, high: 1, medium: 2, none: 3 };
        return items.sort((a, b) => rank[a.priority] - rank[b.priority] || b.suggestedQuantity - a.suggestedQuantity || a.productName.localeCompare(b.productName, 'ar'));
    }
}
