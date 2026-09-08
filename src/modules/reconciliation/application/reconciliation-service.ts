import type{ReconciliationContract,ReconciliationResult,IntegrityIssue}from'../contracts/reconciliation-contract.js';
import type{SalesContract,SaleView}from'../../sales/contracts/sales-contract.js';
import type{PurchaseContract,PurchaseView}from'../../purchases/contracts/purchase-contract.js';
import type{AccountingContract}from'../../accounting/contracts/accounting-contract.js';
import type{CashContract}from'../../cash/contracts/cash-contract.js';
import type{InventoryContract}from'../../inventory/contracts/inventory-contract.js';
import type{SettlementContract}from'../../settlements/contracts/settlement-contract.js';

const moneyEq=(a:number,b:number)=>Math.abs(a-b)<0.011;
const qtyEq=(a:number,b:number)=>Math.abs(a-b)<1e-6;
const sumQty=(lines:readonly {quantity:number}[])=>lines.reduce((s,x)=>s+Number(x.quantity||0),0);

export class ReconciliationService implements ReconciliationContract{
  constructor(
    private readonly sales:SalesContract,
    private readonly purchases:PurchaseContract,
    private readonly accounting:AccountingContract,
    private readonly cash:CashContract,
    private readonly inventory:InventoryContract,
    private readonly settlements:SettlementContract,
  ){}

  async scan(tenantId:string,branchId?:string,limit=100):Promise<ReconciliationResult>{
    const safeLimit=Math.max(1,Math.min(250,Math.trunc(limit||100)));
    const[sales,purchases]=await Promise.all([this.sales.list(tenantId,safeLimit),this.purchases.list(tenantId,safeLimit)]);
    const saleDocs=sales.filter(x=>!branchId||x.branchId===branchId),purchaseDocs=purchases.filter(x=>!branchId||x.branchId===branchId);
    const issueGroups=await Promise.all([
      ...saleDocs.map(x=>this.checkSale(tenantId,x)),
      ...purchaseDocs.map(x=>this.checkPurchase(tenantId,x)),
    ]);
    const issues=issueGroups.flat(),critical=issues.filter(x=>x.severity==='critical').length,warnings=issues.length-critical;
    return{scannedSales:saleDocs.length,scannedPurchases:purchaseDocs.length,issues,critical,warnings,ok:issues.length===0,generatedAt:new Date().toISOString()};
  }

  private async checkSale(t:string,sale:SaleView):Promise<IntegrityIssue[]>{
    const issues:IntegrityIssue[]=[];
    const expectedQty=sumQty(sale.lines);
    const[journal,inventoryQty,cashAmount,obligation]=await Promise.all([
      this.accounting.hasReference(t,'sale',sale.id),
      this.inventory.sourceQuantity(t,sale.branchId,'sale',sale.id,'issue'),
      sale.payment==='cash'?this.cash.referenceAmount(t,sale.branchId,'sale',sale.id,'sale'):Promise.resolve(0),
      sale.payment==='credit'?this.settlements.obligationByReference(t,'sale',sale.id):Promise.resolve(null),
    ]);
    if(!journal)issues.push(this.issue('sale_missing_journal','sale',sale,'فاتورة بيع بدون قيد محاسبي.'));
    if(!qtyEq(inventoryQty,expectedQty))issues.push(this.issue('sale_inventory_mismatch','sale',sale,'كمية خصم المخزون لا تطابق كمية الفاتورة.',expectedQty,inventoryQty));
    if(sale.payment==='cash'&&!moneyEq(cashAmount,sale.total))issues.push(this.issue('sale_cash_mismatch','sale',sale,'الحركة النقدية لا تطابق إجمالي فاتورة البيع.',sale.total,cashAmount));
    if(sale.payment==='credit'&&!obligation)issues.push(this.issue('sale_missing_receivable','sale',sale,'فاتورة بيع آجلة بدون ذمة عميل مرتبطة.'));
    return issues;
  }

  private async checkPurchase(t:string,purchase:PurchaseView):Promise<IntegrityIssue[]>{
    const issues:IntegrityIssue[]=[];
    const expectedQty=sumQty(purchase.lines);
    const[journal,inventoryQty,cashAmount,obligation]=await Promise.all([
      this.accounting.hasReference(t,'purchase',purchase.id),
      this.inventory.sourceQuantity(t,purchase.branchId,'purchase',purchase.id,'receipt'),
      purchase.payment==='cash'?this.cash.referenceAmount(t,purchase.branchId,'purchase',purchase.id,'purchase'):Promise.resolve(0),
      purchase.payment==='credit'?this.settlements.obligationByReference(t,'purchase',purchase.id):Promise.resolve(null),
    ]);
    if(!journal)issues.push(this.issue('purchase_missing_journal','purchase',purchase,'فاتورة شراء بدون قيد محاسبي.'));
    if(!qtyEq(inventoryQty,expectedQty))issues.push(this.issue('purchase_inventory_mismatch','purchase',purchase,'كمية استلام المخزون لا تطابق كمية فاتورة الشراء.',expectedQty,inventoryQty));
    if(purchase.payment==='cash'&&!moneyEq(cashAmount,-purchase.total))issues.push(this.issue('purchase_cash_mismatch','purchase',purchase,'الحركة النقدية لا تطابق إجمالي الشراء النقدي.',-purchase.total,cashAmount));
    if(purchase.payment==='credit'&&!obligation)issues.push(this.issue('purchase_missing_payable','purchase',purchase,'فاتورة شراء آجلة بدون ذمة مورد مرتبطة.'));
    return issues;
  }

  private issue(code:string,type:'sale'|'purchase',doc:SaleView|PurchaseView,message:string,expected?:number,actual?:number):IntegrityIssue{
    const out:IntegrityIssue={code,severity:'critical',documentType:type,documentId:doc.id,documentNumber:doc.number,branchId:doc.branchId,message,...(expected===undefined?{}:{expected}),...(actual===undefined?{}:{actual})};return out;
  }
}
