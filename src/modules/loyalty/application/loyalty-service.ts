import { AppError } from '../../../core/errors/app-error.js';
import type { DbTx } from '../../../core/db/types.js';
import type { LoyaltyContract, LoyaltyRedemptionQuote, LoyaltyRule } from '../contracts/loyalty-contract.js';
import { defaultLoyaltyRule, earnedPointsForAmount, quoteRedemption, validateLoyaltyRule } from '../domain/loyalty-policy.js';
import type { PostgresLoyaltyRepository } from '../infrastructure/postgres-loyalty.js';

const round2=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
export class LoyaltyService implements LoyaltyContract{
  constructor(private readonly repo:PostgresLoyaltyRepository){}
  get(tenantId:string,customerId:string,tx?:DbTx){return this.repo.getAccount(tenantId,customerId,tx);}
  history(tenantId:string,customerId:string,limit=100){return this.repo.history(tenantId,customerId,limit);}
  async getRule(tenantId:string,tx?:DbTx){return await this.repo.getRule(tenantId,tx)??defaultLoyaltyRule(tenantId);}
  async saveRule(input:{tenantId:string;enabled:boolean;earnPointsPerCurrency:number;pointValue:number;minRedeemPoints:number;maxRedeemPercent:number}):Promise<LoyaltyRule>{
    const rule={...input};validateLoyaltyRule(rule);return this.repo.saveRule(rule);
  }
  async quoteRedemption(input:{tenantId:string;customerId:string;requestedPoints:number;saleAmount:number},tx?:DbTx):Promise<LoyaltyRedemptionQuote>{
    const [rule,account]=await Promise.all([this.getRule(input.tenantId,tx),this.get(input.tenantId,input.customerId,tx)]);
    return quoteRedemption(rule,account.points,input.requestedPoints,input.saleAmount);
  }
  async redeemForSale(input:{tenantId:string;customerId:string;requestedPoints:number;saleAmount:number;referenceId:string},tx:DbTx):Promise<LoyaltyRedemptionQuote>{
    if(input.requestedPoints<=0)return this.quoteRedemption(input,tx);
    const account=await this.repo.lockAccount(input.tenantId,input.customerId,tx),rule=await this.getRule(input.tenantId,tx),quote=quoteRedemption(rule,account.points,input.requestedPoints,input.saleAmount);
    if(!rule.enabled)throw new AppError('LOYALTY_DISABLED','برنامج الولاء غير مفعّل',409);
    if(input.requestedPoints<rule.minRedeemPoints)throw new AppError('LOYALTY_MIN_REDEEM','عدد النقاط أقل من الحد الأدنى للاستبدال',422,{minimum:rule.minRedeemPoints});
    if(input.requestedPoints>account.points+1e-9)throw new AppError('LOYALTY_POINTS_INSUFFICIENT','نقاط الولاء غير كافية',409,{available:account.points});
    if(quote.approvedPoints<input.requestedPoints)throw new AppError('LOYALTY_REDEMPTION_LIMIT','قيمة استبدال النقاط تتجاوز الحد المسموح للفاتورة',422,{maximumPoints:quote.maxPointsBySale,maxRedeemPercent:rule.maxRedeemPercent});
    await this.repo.addLedger({tenantId:input.tenantId,customerId:input.customerId,kind:'redeem',points:-quote.approvedPoints,referenceType:'sale_redeem',referenceId:input.referenceId},tx);
    return quote;
  }
  async earnForAmount(input:{tenantId:string;customerId:string;amount:number;referenceId:string},tx:DbTx){
    const rule=await this.getRule(input.tenantId,tx),points=earnedPointsForAmount(rule,input.amount);if(points<=0)return 0;
    await this.repo.lockAccount(input.tenantId,input.customerId,tx);
    await this.repo.addLedger({tenantId:input.tenantId,customerId:input.customerId,kind:'earn',points,referenceType:'sale_earn',referenceId:input.referenceId},tx);
    return points;
  }
  async reverseForReturn(input:{tenantId:string;customerId:string;earnedPoints:number;redeemedPoints:number;proportion:number;referenceId:string},tx:DbTx){
    const proportion=Math.max(0,Math.min(1,input.proportion));
    const restoredRedeemedPoints=round2(Math.max(0,input.redeemedPoints)*proportion),reversedEarnedPoints=round2(Math.max(0,input.earnedPoints)*proportion);
    await this.repo.lockAccount(input.tenantId,input.customerId,tx);
    if(restoredRedeemedPoints>0)await this.repo.addLedger({tenantId:input.tenantId,customerId:input.customerId,kind:'adjust',points:restoredRedeemedPoints,referenceType:'sale_return_redeem_restore',referenceId:input.referenceId},tx);
    if(reversedEarnedPoints>0)await this.repo.addLedger({tenantId:input.tenantId,customerId:input.customerId,kind:'adjust',points:-reversedEarnedPoints,referenceType:'sale_return_earn_reverse',referenceId:input.referenceId},tx);
    return{restoredRedeemedPoints,reversedEarnedPoints};
  }
}
