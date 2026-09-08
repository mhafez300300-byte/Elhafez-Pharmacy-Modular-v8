import type { DbExecutor, DbTx } from '../../../core/db/types.js';
import type { PlatformActivationStoreContract } from '../contracts/activation-contract.js';
export class PostgresPlatformRepository implements PlatformActivationStoreContract{
  constructor(private readonly db:DbExecutor){}
  async saveActivation(input:{tenantId:string;companyCode:string|null;mode:'owner_center'|'standalone';status:string;plan:string;expiresAt:string|null;features:readonly string[]},tx:DbTx){
    await tx.query(`INSERT INTO platform_activation(tenant_id,company_code,mode,status,plan,expires_at,features) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)`,[input.tenantId,input.companyCode,input.mode,input.status,input.plan,input.expiresAt,JSON.stringify(input.features)]);
  }
}
