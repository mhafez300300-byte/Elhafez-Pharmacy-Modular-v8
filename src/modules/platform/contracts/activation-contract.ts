import type { DbTx } from '../../../core/db/types.js';
export type ActivationClaims=Readonly<{customerCode:string;customerName:string;status:'trial'|'active'|'suspended'|'expired';plan:string;expiresAt?:string;features:readonly string[]}>;
export interface ActivationContract{resolve(companyCode:string):Promise<ActivationClaims|null>;}
export interface PlatformActivationStoreContract{
  saveActivation(input:{tenantId:string;companyCode:string|null;mode:'owner_center'|'standalone';status:string;plan:string;expiresAt:string|null;features:readonly string[]},tx:DbTx):Promise<void>;
}
