import type { CatalogContract } from '../../catalog/contracts/catalog-contract.js';
import type { InventoryContract } from '../../inventory/contracts/inventory-contract.js';
import type { SalesContract } from '../../sales/contracts/sales-contract.js';
import type { ReplenishmentRecommendation } from '../contracts/replenishment-contract.js';
import { calculateReorder } from '../domain/reorder-policy.js';

export class ReplenishmentService {
  constructor(
    private readonly catalog: CatalogContract,
    private readonly inventory: InventoryContract,
    private readonly sales: SalesContract,
  ) {}

  async recommendations(tenantId: string, branchId: string, targetDays = 21): Promise<ReplenishmentRecommendation[]> {
    const [products, balances, demand7, demand30] = await Promise.all([
      this.catalog.list(tenantId, '', 500),
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
      } satisfies ReplenishmentRecommendation;
    });
    const rank = { critical: 0, high: 1, medium: 2, none: 3 } as const;
    return items.sort((a, b) => rank[a.priority] - rank[b.priority] || b.suggestedQuantity - a.suggestedQuantity || a.productName.localeCompare(b.productName, 'ar'));
  }
}
