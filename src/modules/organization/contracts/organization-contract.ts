import type { DbTx } from '../../../core/db/types.js';

export type BranchView = Readonly<{ id: string; tenantId: string; name: string; active: boolean }>;
export type TenantView = Readonly<{ id: string; name: string; status: string; currency: string }>;

export interface OrganizationContract {
  getTenant(tenantId: string, tx?: DbTx): Promise<TenantView | null>;
  getDefaultBranch(tenantId: string, tx?: DbTx): Promise<BranchView | null>;
  createTenantWithBranch(input: { tenantId: string; name: string; currency: string; branchId: string; branchName: string }, tx: DbTx): Promise<{ tenant: TenantView; branch: BranchView }>;
  listBranches(tenantId: string): Promise<BranchView[]>;
  createBranch(input:{id:string;tenantId:string;name:string},tx?:DbTx):Promise<BranchView>;
  listActiveTenantBranches():Promise<Array<{tenantId:string;branchId:string}>>;
}
