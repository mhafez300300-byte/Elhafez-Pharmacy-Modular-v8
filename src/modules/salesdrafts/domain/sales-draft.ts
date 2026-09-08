import { AppError } from '../../../core/errors/app-error.js';
import type { SuspendedSaleCart } from '../contracts/sales-draft-contract.js';

export type SuspendedSaleInput=Readonly<{
 branchId:string;label?:string;customerId?:string|null;payment?:string;invoiceDiscount?:number;loyaltyPointsToRedeem?:number;
 lines:ReadonlyArray<{productId:string;quantity:number;unitPrice?:number;discount?:number}>;
}>;
export function normalizeSuspendedSale(input:SuspendedSaleInput):Omit<SuspendedSaleCart,'id'|'tenantId'|'userId'|'createdAt'|'updatedAt'>{
 const branchId=input.branchId.trim();if(!branchId)throw new AppError('DRAFT_BRANCH_REQUIRED','الفرع مطلوب لتعليق الفاتورة',422);
 if(!Array.isArray(input.lines)||input.lines.length===0)throw new AppError('DRAFT_EMPTY','لا يمكن تعليق فاتورة فارغة',422);
 if(input.lines.length>250)throw new AppError('DRAFT_TOO_LARGE','الفاتورة المعلقة أكبر من الحد المسموح',422);
 const lines=input.lines.map((l,i)=>{const productId=String(l.productId??'').trim(),quantity=Number(l.quantity),unitPrice=l.unitPrice==null?undefined:Number(l.unitPrice),discount=l.discount==null?undefined:Number(l.discount);if(!productId||!Number.isFinite(quantity)||quantity<=0)throw new AppError('DRAFT_LINE_INVALID',`سطر ${i+1} غير صحيح`,422);if(unitPrice!=null&&(!Number.isFinite(unitPrice)||unitPrice<0))throw new AppError('DRAFT_LINE_INVALID',`سعر سطر ${i+1} غير صحيح`,422);if(discount!=null&&(!Number.isFinite(discount)||discount<0))throw new AppError('DRAFT_LINE_INVALID',`خصم سطر ${i+1} غير صحيح`,422);return{productId,quantity,...(unitPrice==null?{}:{unitPrice}),...(discount==null?{}:{discount})};});
 const payment=(input.payment??'cash') as 'cash'|'card'|'credit';if(!['cash','card','credit'].includes(payment))throw new AppError('DRAFT_PAYMENT_INVALID','طريقة الدفع غير صحيحة',422);
 const invoiceDiscount=Number(input.invoiceDiscount??0),loyaltyPointsToRedeem=Math.floor(Number(input.loyaltyPointsToRedeem??0));if(!Number.isFinite(invoiceDiscount)||invoiceDiscount<0||!Number.isFinite(loyaltyPointsToRedeem)||loyaltyPointsToRedeem<0)throw new AppError('DRAFT_TOTALS_INVALID','بيانات الخصم أو الولاء غير صحيحة',422);
 const label=String(input.label??'').trim().slice(0,80)||`فاتورة معلقة ${new Date().toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'})}`;
 return{branchId,label,customerId:input.customerId?String(input.customerId):null,payment,invoiceDiscount,loyaltyPointsToRedeem,lines};
}
