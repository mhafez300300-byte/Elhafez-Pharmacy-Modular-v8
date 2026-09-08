import type { CustomerView } from '../../customers/contracts/customer-contract.js';
import type { SupplierView } from '../../suppliers/contracts/supplier-contract.js';
import type { SaleView } from '../../sales/contracts/sales-contract.js';
import type { PurchaseView } from '../../purchases/contracts/purchase-contract.js';
import type { ObligationView, PaymentView } from '../../settlements/contracts/settlement-contract.js';

export type Customer360View = Readonly<{
  kind:'customer'; party:CustomerView; outstanding:number; availableCredit:number;
  salesTotal:number; receivedTotal:number; lastActivityAt:string|null;
  obligations:readonly ObligationView[]; payments:readonly PaymentView[]; sales:readonly SaleView[];
}>;
export type Supplier360View = Readonly<{
  kind:'supplier'; party:SupplierView; outstanding:number;
  purchasesTotal:number; paidTotal:number; lastActivityAt:string|null;
  obligations:readonly ObligationView[]; payments:readonly PaymentView[]; purchases:readonly PurchaseView[];
}>;
