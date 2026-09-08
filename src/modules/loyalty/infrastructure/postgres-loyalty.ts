import type { DbExecutor, DbTx } from '../../../core/db/types.js';
import type { LoyaltyAccount, LoyaltyRule } from '../contracts/loyalty-contract.js';

export class PostgresLoyaltyRepository {
  constructor(private readonly db:DbExecutor){}
  private ex(tx?:DbTx){return tx??this.db;}

  async getAccount(tenantId:string,customerId:string,tx?:DbTx):Promise<LoyaltyAccount>{
    const q=await this.ex(tx).query<LoyaltyAccount>(`SELECT tenant_id as "tenantId",customer_id as "customerId",points::float,updated_at::text as "updatedAt" FROM loy_accounts WHERE tenant_id=$1 AND customer_id=$2`,[tenantId,customerId]);
    return q.rows[0]??{tenantId,customerId,points:0,updatedAt:new Date().toISOString()};
  }
  async lockAccount(tenantId:string,customerId:string,tx:DbTx):Promise<LoyaltyAccount>{
    await tx.query(`INSERT INTO loy_accounts(tenant_id,customer_id,points) VALUES($1,$2,0) ON CONFLICT(tenant_id,customer_id) DO NOTHING`,[tenantId,customerId]);
    const q=await tx.query<LoyaltyAccount>(`SELECT tenant_id as "tenantId",customer_id as "customerId",points::float,updated_at::text as "updatedAt" FROM loy_accounts WHERE tenant_id=$1 AND customer_id=$2 FOR UPDATE`,[tenantId,customerId]);
    return q.rows[0]!;
  }
  async getRule(tenantId:string,tx?:DbTx):Promise<LoyaltyRule|null>{
    const q=await this.ex(tx).query<LoyaltyRule>(`SELECT tenant_id as "tenantId",enabled,earn_points_per_currency::float as "earnPointsPerCurrency",point_value::float as "pointValue",min_redeem_points::float as "minRedeemPoints",max_redeem_percent::float as "maxRedeemPercent",updated_at::text as "updatedAt" FROM loy_rules WHERE tenant_id=$1`,[tenantId]);
    return q.rows[0]??null;
  }
  async saveRule(input:Omit<LoyaltyRule,'updatedAt'>):Promise<LoyaltyRule>{
    const q=await this.db.query<LoyaltyRule>(`INSERT INTO loy_rules(tenant_id,enabled,earn_points_per_currency,point_value,min_redeem_points,max_redeem_percent) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(tenant_id) DO UPDATE SET enabled=EXCLUDED.enabled,earn_points_per_currency=EXCLUDED.earn_points_per_currency,point_value=EXCLUDED.point_value,min_redeem_points=EXCLUDED.min_redeem_points,max_redeem_percent=EXCLUDED.max_redeem_percent,updated_at=now() RETURNING tenant_id as "tenantId",enabled,earn_points_per_currency::float as "earnPointsPerCurrency",point_value::float as "pointValue",min_redeem_points::float as "minRedeemPoints",max_redeem_percent::float as "maxRedeemPercent",updated_at::text as "updatedAt"`,[input.tenantId,input.enabled,input.earnPointsPerCurrency,input.pointValue,input.minRedeemPoints,input.maxRedeemPercent]);
    return q.rows[0]!;
  }
  async addLedger(input:{tenantId:string;customerId:string;kind:'earn'|'redeem'|'adjust';points:number;referenceType:string;referenceId:string},tx:DbTx){
    if(Math.abs(input.points)<1e-9)return;
    await tx.query(`UPDATE loy_accounts SET points=points+$3,updated_at=now() WHERE tenant_id=$1 AND customer_id=$2`,[input.tenantId,input.customerId,input.points]);
    await tx.query(`INSERT INTO loy_ledger(tenant_id,customer_id,kind,points,reference_type,reference_id) VALUES($1,$2,$3,$4,$5,$6)`,[input.tenantId,input.customerId,input.kind,input.points,input.referenceType,input.referenceId]);
  }
  async history(tenantId:string,customerId:string,limit=100){
    return(await this.db.query(`SELECT kind,points::float,reference_type as "referenceType",reference_id as "referenceId",created_at::text as "createdAt" FROM loy_ledger WHERE tenant_id=$1 AND customer_id=$2 ORDER BY created_at DESC LIMIT $3`,[tenantId,customerId,Math.min(500,Math.max(1,limit))])).rows;
  }
}
