import { AppError } from '../../../core/errors/app-error.js';
import type { LoyaltyRedemptionQuote, LoyaltyRule } from '../contracts/loyalty-contract.js';

const round2=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
const nonNegative=(n:number)=>Number.isFinite(n)&&n>=0;

export const defaultLoyaltyRule=(tenantId:string):LoyaltyRule=>({
  tenantId,
  enabled:true,
  earnPointsPerCurrency:1,
  pointValue:0.01,
  minRedeemPoints:100,
  maxRedeemPercent:20,
  updatedAt:new Date(0).toISOString(),
});

export function validateLoyaltyRule(input:Omit<LoyaltyRule,'updatedAt'>){
  if(!nonNegative(input.earnPointsPerCurrency)||input.earnPointsPerCurrency>1000)throw new AppError('LOYALTY_EARN_RATE_INVALID','معدل اكتساب النقاط غير صحيح',422);
  if(!Number.isFinite(input.pointValue)||input.pointValue<=0||input.pointValue>1000)throw new AppError('LOYALTY_POINT_VALUE_INVALID','قيمة النقطة غير صحيحة',422);
  if(!nonNegative(input.minRedeemPoints)||input.minRedeemPoints>1_000_000)throw new AppError('LOYALTY_MIN_REDEEM_INVALID','الحد الأدنى لاستبدال النقاط غير صحيح',422);
  if(!nonNegative(input.maxRedeemPercent)||input.maxRedeemPercent>100)throw new AppError('LOYALTY_MAX_PERCENT_INVALID','أقصى نسبة استبدال غير صحيحة',422);
}

export function earnedPointsForAmount(rule:LoyaltyRule,amount:number){
  if(!rule.enabled||amount<=0)return 0;
  return Math.max(0,Math.floor(amount*rule.earnPointsPerCurrency+1e-9));
}

export function quoteRedemption(rule:LoyaltyRule,availablePoints:number,requestedPoints:number,saleAmount:number):LoyaltyRedemptionQuote{
  const requested=Math.max(0,Math.floor(Number(requestedPoints)||0));
  const available=Math.floor(Number(availablePoints)||0);
  const maxDiscount=round2(Math.max(0,saleAmount)*(rule.maxRedeemPercent/100));
  const maxPointsBySale=Math.max(0,Math.floor(maxDiscount/rule.pointValue+1e-9));
  const approved=rule.enabled&&requested>0?Math.min(requested,Math.max(0,available),maxPointsBySale):0;
  return{
    requestedPoints:requested,
    approvedPoints:approved,
    availablePoints:available,
    maxPointsBySale,
    discount:round2(approved*rule.pointValue),
    pointValue:rule.pointValue,
    minRedeemPoints:rule.minRedeemPoints,
    maxRedeemPercent:rule.maxRedeemPercent,
  };
}
