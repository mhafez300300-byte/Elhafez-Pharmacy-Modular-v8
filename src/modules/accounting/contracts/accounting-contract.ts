import type{DbTx}from'../../../core/db/types.js';
export type JournalLine=Readonly<{accountCode:string;debit:number;credit:number;memo?:string}>;
export type AccountView=Readonly<{code:string;nameAr:string;type:'asset'|'liability'|'equity'|'revenue'|'contra_revenue'|'expense'|'cogs';normalSide:'debit'|'credit';active:boolean}>;
export type AccountingPeriodView=Readonly<{id:string;fromDate:string;toDate:string;status:'open'|'closed';closedBy:string|null;closedAt:string|null;reopenedBy:string|null;reopenedAt:string|null}>;
export interface AccountingContract{
  post(input:{id:string;tenantId:string;branchId:string;referenceType:string;referenceId:string;description:string;postingDate?:string;lines:readonly JournalLine[]},tx:DbTx):Promise<void>;
  listEntries(tenantId:string,limit?:number):Promise<unknown[]>;
  hasReference(tenantId:string,referenceType:string,referenceId:string):Promise<boolean>;
  ensureDefaultChart(tenantId:string,tx?:DbTx):Promise<void>;
  listAccounts(tenantId:string):Promise<AccountView[]>;
  trialBalance(tenantId:string,fromDate?:string,toDate?:string):Promise<unknown>;
  incomeStatement(tenantId:string,fromDate?:string,toDate?:string):Promise<unknown>;
  balanceSheet(tenantId:string,atDate?:string):Promise<unknown>;
  listPeriods(tenantId:string):Promise<AccountingPeriodView[]>;
  closePeriod(input:{id:string;tenantId:string;fromDate:string;toDate:string;userId:string},tx?:DbTx):Promise<AccountingPeriodView>;
  reopenPeriod(input:{tenantId:string;periodId:string;userId:string},tx?:DbTx):Promise<AccountingPeriodView>;
}
