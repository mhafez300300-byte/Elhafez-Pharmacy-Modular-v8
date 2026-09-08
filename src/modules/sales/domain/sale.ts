import { AppError } from '../../../core/errors/app-error.js';

export type SaleLineInput=Readonly<{productId:string;quantity:number;unitPrice?:number;discount?:number}>;
export type SaleInput=Readonly<{
  branchId:string;
  customerId?:string|null;
  payment:'cash'|'card'|'credit';
  prescriptionId?:string|null;
  lines:readonly SaleLineInput[];
  invoiceDiscount?:number;
  loyaltyPointsToRedeem?:number;
  idempotencyKey?:string|undefined;
  creditOverrideReason?:string|undefined;
}>;

export function validateSale(input:SaleInput){
  if(!input.branchId)throw new AppError('BRANCH_REQUIRED','الفرع مطلوب',422);
  if(!['cash','card','credit'].includes(input.payment))throw new AppError('PAYMENT_INVALID','طريقة الدفع غير صحيحة',422);
  if(!Array.isArray(input.lines)||input.lines.length===0)throw new AppError('SALE_LINES_REQUIRED','أضف صنفاً واحداً على الأقل',422);
  for(const line of input.lines){
    if(!line.productId||!Number.isFinite(line.quantity)||line.quantity<=0)throw new AppError('SALE_LINE_INVALID','بيانات صنف البيع غير صحيحة',422);
    if((line.discount??0)<0)throw new AppError('DISCOUNT_INVALID','الخصم غير صحيح',422);
  }
  if((input.invoiceDiscount??0)<0)throw new AppError('DISCOUNT_INVALID','خصم الفاتورة غير صحيح',422);
  if(!Number.isFinite(input.loyaltyPointsToRedeem??0)||(input.loyaltyPointsToRedeem??0)<0)throw new AppError('LOYALTY_POINTS_INVALID','عدد نقاط الولاء غير صحيح',422);
  if((input.loyaltyPointsToRedeem??0)>0&&!input.customerId)throw new AppError('LOYALTY_CUSTOMER_REQUIRED','استبدال النقاط يتطلب اختيار عميل',422);
  if(input.idempotencyKey&&(!/^[A-Za-z0-9._:-]{8,120}$/.test(input.idempotencyKey)))throw new AppError('IDEMPOTENCY_KEY_INVALID','مفتاح منع التكرار غير صحيح',422);
  if(input.creditOverrideReason&&input.creditOverrideReason.trim().length>250)throw new AppError('CREDIT_OVERRIDE_REASON_INVALID','سبب تجاوز حد الائتمان طويل جدًا',422);
  return input;
}
