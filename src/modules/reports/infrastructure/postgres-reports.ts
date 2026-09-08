import type { DbExecutor } from '../../../core/db/types.js';
import type { ReportContract } from '../contracts/report-contract.js';

export class PostgresReportRepository implements ReportContract {
  constructor(private readonly db:DbExecutor) {}
  async dashboard(t:string,b:string){
    const[sales,purchases,stock,alerts]=await Promise.all([
      this.db.query<{total:number;count:number}>(`SELECT COALESCE(sum(total),0)::float total,count(*)::int count FROM sales_invoices WHERE tenant_id=$1 AND branch_id=$2 AND created_at::date=current_date`,[t,b]),
      this.db.query<{total:number;count:number}>(`SELECT COALESCE(sum(total),0)::float total,count(*)::int count FROM purchase_receipts WHERE tenant_id=$1 AND branch_id=$2 AND created_at::date=current_date`,[t,b]),
      this.db.query<{cost:number}>(`SELECT COALESCE(sum(quantity*unit_cost),0)::float cost FROM inv_batches WHERE tenant_id=$1 AND branch_id=$2 AND status='sellable'`,[t,b]),
      this.db.query<{count:number}>(`SELECT count(*)::int count FROM inv_batches WHERE tenant_id=$1 AND branch_id=$2 AND status='sellable' AND quantity>0 AND expiry_date IS NOT NULL AND expiry_date<=current_date+interval '90 days'`,[t,b]),
    ]);
    return{todaySales:sales.rows[0]??{total:0,count:0},todayPurchases:purchases.rows[0]??{total:0,count:0},stockValue:stock.rows[0]?.cost??0,expiryAlerts:alerts.rows[0]?.count??0};
  }
  async salesSummary(t:string,from?:string,to?:string){const q=await this.db.query(`SELECT created_at::date as day,count(*)::int invoices,COALESCE(sum(total),0)::float total,COALESCE(sum(profit),0)::float profit FROM sales_invoices WHERE tenant_id=$1 AND ($2::date IS NULL OR created_at::date>=$2::date) AND ($3::date IS NULL OR created_at::date<=$3::date) GROUP BY created_at::date ORDER BY day`,[t,from??null,to??null]);return{items:q.rows};}
  async stockAlerts(t:string,b:string){return(await this.db.query(`SELECT p.id as "productId",p.name,b.id as "batchId",b.batch_no as "batchNo",b.expiry_date::text as "expiryDate",b.quantity::float FROM inv_batches b JOIN cat_products p ON p.id=b.product_id AND p.tenant_id=b.tenant_id WHERE b.tenant_id=$1 AND b.branch_id=$2 AND b.status='sellable' AND b.quantity>0 AND b.expiry_date IS NOT NULL AND b.expiry_date<=current_date+interval '90 days' ORDER BY b.expiry_date`,[t,b])).rows;}
  async stockHealth(t:string,b:string){
    return (await this.db.query(`WITH stock AS (
      SELECT p.id,p.name,p.barcode,p.reorder_level::float reorder_level,
        COALESCE(sum(CASE WHEN ib.status='sellable' THEN ib.quantity ELSE 0 END),0)::float qty,
        COALESCE(sum(CASE WHEN ib.status='sellable' THEN ib.quantity*ib.unit_cost ELSE 0 END),0)::float stock_value,
        min(CASE WHEN ib.status='sellable' AND ib.quantity>0 THEN ib.expiry_date END)::text nearest_expiry,
        COALESCE(sum(CASE WHEN ib.status='sellable' AND ib.expiry_date<current_date THEN ib.quantity ELSE 0 END),0)::float expired_qty,
        COALESCE(sum(CASE WHEN ib.status='sellable' AND ib.expiry_date>=current_date AND ib.expiry_date<=current_date+interval '90 days' THEN ib.quantity ELSE 0 END),0)::float expiring_qty
      FROM cat_products p LEFT JOIN inv_batches ib ON ib.tenant_id=p.tenant_id AND ib.product_id=p.id AND ib.branch_id=$2
      WHERE p.tenant_id=$1 AND p.active=true GROUP BY p.id
    ), demand AS (
      SELECT sl.product_id,COALESCE(sum(sl.quantity),0)::float sold30 FROM sales_lines sl JOIN sales_invoices si ON si.id=sl.sale_id
      WHERE si.tenant_id=$1 AND si.branch_id=$2 AND si.created_at>=now()-interval '30 days' GROUP BY sl.product_id
    ) SELECT s.id as "productId",s.name,s.barcode,s.qty as quantity,s.reorder_level as "reorderLevel",s.stock_value as "stockValue",s.nearest_expiry as "nearestExpiry",s.expired_qty as "expiredQty",s.expiring_qty as "expiringQty",COALESCE(d.sold30,0)::float as "sold30",
      CASE WHEN s.qty<=0 THEN 'out' WHEN s.qty<=s.reorder_level THEN 'low' WHEN COALESCE(d.sold30,0)=0 AND s.qty>0 THEN 'slow' ELSE 'healthy' END status
    FROM stock s LEFT JOIN demand d ON d.product_id=s.id ORDER BY CASE WHEN s.qty<=0 THEN 0 WHEN s.qty<=s.reorder_level THEN 1 WHEN COALESCE(d.sold30,0)=0 AND s.qty>0 THEN 2 ELSE 3 END,s.name`,[t,b])).rows;
  }
  async supplierPerformance(t:string){
    return (await this.db.query(`WITH buys AS (
      SELECT supplier_id,count(*)::int receipts,COALESCE(sum(total),0)::float total,COALESCE(avg(total),0)::float average,max(created_at)::text last_purchase
      FROM purchase_receipts WHERE tenant_id=$1 GROUP BY supplier_id
    ), rets AS (
      SELECT supplier_id,COALESCE(sum(total),0)::float returns_total FROM purchase_returns WHERE tenant_id=$1 GROUP BY supplier_id
    ), due AS (
      SELECT party_id,COALESCE(sum(balance),0)::float payable FROM fin_obligations WHERE tenant_id=$1 AND party_type='supplier' GROUP BY party_id
    ) SELECT s.id as "supplierId",s.name,s.phone,COALESCE(b.receipts,0)::int receipts,COALESCE(b.total,0)::float total,COALESCE(b.average,0)::float average,COALESCE(r.returns_total,0)::float as "returnsTotal",COALESCE(d.payable,0)::float payable,b.last_purchase as "lastPurchaseAt"
    FROM crm_suppliers s LEFT JOIN buys b ON b.supplier_id=s.id LEFT JOIN rets r ON r.supplier_id=s.id LEFT JOIN due d ON d.party_id=s.id
    WHERE s.tenant_id=$1 AND s.active=true ORDER BY COALESCE(b.total,0) DESC,s.name`,[t])).rows;
  }
  async partyBalances(t:string){
    const [customers,suppliers]=await Promise.all([
      this.db.query(`SELECT c.id,c.name,c.phone,c.credit_limit::float as "creditLimit",COALESCE(sum(o.balance),0)::float balance FROM crm_customers c LEFT JOIN fin_obligations o ON o.tenant_id=c.tenant_id AND o.party_type='customer' AND o.party_id=c.id WHERE c.tenant_id=$1 AND c.active=true GROUP BY c.id ORDER BY balance DESC,c.name`,[t]),
      this.db.query(`SELECT s.id,s.name,s.phone,COALESCE(sum(o.balance),0)::float balance FROM crm_suppliers s LEFT JOIN fin_obligations o ON o.tenant_id=s.tenant_id AND o.party_type='supplier' AND o.party_id=s.id WHERE s.tenant_id=$1 AND s.active=true GROUP BY s.id ORDER BY balance DESC,s.name`,[t]),
    ]);
    return{customers:customers.rows,suppliers:suppliers.rows};
  }
  async returnAnalysis(t:string,from?:string,to?:string){
    const [sales,suppliers]=await Promise.all([
      this.db.query(`SELECT l.classification,count(DISTINCT r.id)::int returns,COALESCE(sum(l.quantity),0)::float quantity,COALESCE(sum(l.amount),0)::float amount FROM sales_return_lines l JOIN sales_returns r ON r.id=l.return_id WHERE r.tenant_id=$1 AND ($2::date IS NULL OR r.created_at::date>=$2::date) AND ($3::date IS NULL OR r.created_at::date<=$3::date) GROUP BY l.classification ORDER BY amount DESC`,[t,from??null,to??null]),
      this.db.query(`SELECT count(*)::int returns,COALESCE(sum(total),0)::float amount FROM purchase_returns WHERE tenant_id=$1 AND ($2::date IS NULL OR created_at::date>=$2::date) AND ($3::date IS NULL OR created_at::date<=$3::date)`,[t,from??null,to??null]),
    ]);
    return{saleReturns:sales.rows,supplierReturns:suppliers.rows[0]??{returns:0,amount:0}};
  }
}
