export class IntelligenceService {
    db;
    replenishment;
    constructor(db, replenishment) {
        this.db = db;
        this.replenishment = replenishment;
    }
    async snapshot(t, b, targetDays = 21, deadStockDays = 90) {
        const recs = await this.replenishment.recommendations(t, b, targetDays);
        const actionable = recs.filter(x => x.suggestedQuantity > 0);
        const ids = actionable.map(x => x.productId);
        const supplierRows = ids.length ? (await this.db.query(`WITH ranked AS (
    SELECT pl.product_id,pr.supplier_id,s.name supplier_name,pl.unit_cost::float unit_cost,pr.created_at,
      row_number() over(partition by pl.product_id,pr.supplier_id order by pr.created_at desc) rn
    FROM purchase_lines pl JOIN purchase_receipts pr ON pr.id=pl.purchase_id JOIN crm_suppliers s ON s.id=pr.supplier_id
    WHERE pr.tenant_id=$1 AND pl.product_id=ANY($2::text[]) AND pr.created_at>=now()-interval '365 days'
  ) SELECT product_id as "productId",supplier_id as "supplierId",supplier_name as "supplierName",
    max(CASE WHEN rn=1 THEN unit_cost END)::float as "lastCost",avg(unit_cost)::float as "averageCost",min(unit_cost)::float as "minCost",
    max(created_at)::text as "lastPurchaseAt",count(*)::int purchases FROM ranked GROUP BY product_id,supplier_id,supplier_name`, [t, ids])).rows : [];
        const byProduct = new Map();
        for (const r of supplierRows) {
            const x = { supplierId: r.supplierId, supplierName: r.supplierName, lastCost: Number(r.lastCost || 0), averageCost: Number(r.averageCost || 0), minCost: Number(r.minCost || 0), lastPurchaseAt: r.lastPurchaseAt ?? null, purchases: Number(r.purchases || 0), savingVsLast: Math.max(0, Number(r.lastCost || 0) - Number(r.minCost || 0)) };
            const a = byProduct.get(r.productId) ?? [];
            a.push(x);
            byProduct.set(r.productId, a);
        }
        const purchase = actionable.map(r => { const suppliers = (byProduct.get(r.productId) ?? []).sort((a, c) => a.minCost - c.minCost || c.purchases - a.purchases), best = suppliers[0] ?? null; return { ...r, suppliers: suppliers.slice(0, 5), recommendedSupplierId: best?.supplierId ?? null, recommendedSupplierName: best?.supplierName ?? null, recommendedUnitCost: best?.minCost ?? null, estimatedSpend: best ? best.minCost * r.suggestedQuantity : null }; });
        const profit = (await this.db.query(`SELECT p.id as "productId",p.name as "productName",p.selling_price::float as "sellingPrice",p.cost_price::float as "catalogCost",
    COALESCE(sum(sl.quantity),0)::float quantity,COALESCE(sum(sl.net),0)::float revenue,COALESCE(sum(sl.cost),0)::float cost,
    COALESCE(sum(sl.net-sl.cost),0)::float profit
    FROM cat_products p LEFT JOIN (sales_lines sl JOIN sales_invoices si ON si.id=sl.sale_id AND si.tenant_id=$1 AND si.branch_id=$2 AND si.created_at>=now()-interval '30 days') ON sl.product_id=p.id
    WHERE p.tenant_id=$1 AND p.active=true GROUP BY p.id ORDER BY profit ASC`, [t, b])).rows.map((r) => { const revenue = Number(r.revenue || 0), profit = Number(r.profit || 0), margin = revenue ? profit / revenue * 100 : 0; return { ...r, quantity: Number(r.quantity || 0), revenue, cost: Number(r.cost || 0), profit, marginPercent: margin, signal: revenue === 0 ? 'no_sales' : profit < 0 ? 'loss' : margin < 10 ? 'thin' : 'strong' }; });
        const deadStock = (await this.db.query(`WITH stock AS(SELECT p.id,p.name,p.barcode,COALESCE(sum(CASE WHEN ib.status='sellable' THEN ib.quantity ELSE 0 END),0)::float quantity,COALESCE(sum(CASE WHEN ib.status='sellable' THEN ib.quantity*ib.unit_cost ELSE 0 END),0)::float stock_value,min(CASE WHEN ib.status='sellable' AND ib.quantity>0 THEN ib.expiry_date END)::text nearest_expiry FROM cat_products p LEFT JOIN inv_batches ib ON ib.product_id=p.id AND ib.tenant_id=p.tenant_id AND ib.branch_id=$2 WHERE p.tenant_id=$1 AND p.active=true GROUP BY p.id), last_sale AS(SELECT sl.product_id,max(si.created_at) last_sale_at FROM sales_lines sl JOIN sales_invoices si ON si.id=sl.sale_id WHERE si.tenant_id=$1 AND si.branch_id=$2 GROUP BY sl.product_id) SELECT s.id as "productId",s.name as "productName",s.barcode,s.quantity,s.stock_value as "stockValue",ls.last_sale_at::text as "lastSaleAt",CASE WHEN ls.last_sale_at IS NULL THEN NULL ELSE floor(extract(epoch from(now()-ls.last_sale_at))/86400)::int END as "daysSinceSale",s.nearest_expiry as "nearestExpiry" FROM stock s LEFT JOIN last_sale ls ON ls.product_id=s.id WHERE s.quantity>0 AND (ls.last_sale_at IS NULL OR ls.last_sale_at<now()-($3::int||' days')::interval) ORDER BY s.stock_value DESC`, [t, b, deadStockDays])).rows.map((r) => ({ ...r, quantity: Number(r.quantity || 0), stockValue: Number(r.stockValue || 0), daysSinceSale: r.daysSinceSale == null ? null : Number(r.daysSinceSale), severity: (r.lastSaleAt == null || Number(r.daysSinceSale) >= deadStockDays * 2) ? 'critical' : Number(r.daysSinceSale) >= Math.round(deadStockDays * 1.5) ? 'high' : 'medium' }));
        const estimatedPurchaseSpend = purchase.reduce((a, x) => a + (x.estimatedSpend ?? 0), 0), potentialSupplierSaving = purchase.reduce((a, x) => { const s = x.suppliers; if (s.length < 2)
            return a; return a + Math.max(0, s[s.length - 1].minCost - s[0].minCost) * x.suggestedQuantity; }, 0);
        const actions = [...purchase.filter(x => x.priority === 'critical').slice(0, 20).map(x => ({ type: 'buy', priority: 'critical', title: `شراء عاجل: ${x.productName}`, detail: `المتاح ${x.currentStock} والمقترح ${x.suggestedQuantity}${x.recommendedSupplierName ? ` — المورد الأنسب ${x.recommendedSupplierName}` : ''}`, productId: x.productId, estimatedValue: x.estimatedSpend ?? undefined })), ...purchase.filter(x => x.suppliers.length > 1 && x.suppliers[x.suppliers.length - 1].minCost > x.suppliers[0].minCost).slice(0, 20).map(x => ({ type: 'supplier_switch', priority: 'high', title: `فرصة توفير: ${x.productName}`, detail: `قارن ${x.suppliers.length} موردين قبل الطلب؛ الأقل تاريخيًا ${x.recommendedSupplierName ?? 'غير محدد'}`, productId: x.productId, estimatedValue: (x.suppliers[x.suppliers.length - 1].minCost - x.suppliers[0].minCost) * x.suggestedQuantity })), ...profit.filter(x => x.signal === 'loss').slice(0, 20).map(x => ({ type: 'margin_review', priority: 'critical', title: `مراجعة سعر: ${x.productName}`, detail: `الصنف حقق خسارة ${Math.abs(x.profit).toFixed(2)} خلال 30 يومًا`, productId: x.productId, estimatedValue: Math.abs(x.profit) })), ...deadStock.filter(x => x.severity === 'critical').slice(0, 20).map(x => ({ type: 'dead_stock', priority: 'high', title: `تصريف مخزون: ${x.productName}`, detail: `قيمة راكدة ${x.stockValue.toFixed(2)} ولم يتحرك ${x.daysSinceSale ?? 'منذ التسجيل'} يوم`, productId: x.productId, estimatedValue: x.stockValue }))];
        return { purchase, profit, deadStock, actions, summary: { purchaseLines: purchase.length, estimatedPurchaseSpend, potentialSupplierSaving, thinMarginProducts: profit.filter(x => x.signal === 'thin').length, lossProducts: profit.filter(x => x.signal === 'loss').length, deadStockProducts: deadStock.length, deadStockValue: deadStock.reduce((a, x) => a + x.stockValue, 0) }, generatedAt: new Date().toISOString() };
    }
}
