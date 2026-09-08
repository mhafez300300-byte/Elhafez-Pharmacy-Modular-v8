import type { DbTx } from '../../../core/db/types.js';
export type PartyType='customer'|'supplier';
export type ObligationView=Readonly<{id:string;tenantId:string;partyType:PartyType;partyId:string;referenceType:string;referenceId:string;originalAmount:number;balance:number;status:'open'|'partial'|'settled';createdAt:string}>;
export type PaymentView=Readonly<{id:string;tenantId:string;branchId:string;partyType:PartyType;partyId:string;direction:'receive'|'pay';method:'cash'|'card'|'bank';amount:number;unallocated:number;createdAt:string;allocations:ReadonlyArray<{obligationId:string;amount:number}>}>;
export interface SettlementContract{
 createObligation(input:{id:string;tenantId:string;partyType:PartyType;partyId:string;referenceType:string;referenceId:string;amount:number},tx:DbTx):Promise<void>;
 reduceObligationByReference(input:{tenantId:string;referenceType:string;referenceId:string;amount:number},tx:DbTx):Promise<void>;
 listObligations(tenantId:string,partyType?:PartyType,partyId?:string):Promise<ObligationView[]>;
 obligationByReference(tenantId:string,referenceType:string,referenceId:string):Promise<ObligationView|null>;
 balance(tenantId:string,partyType:PartyType,partyId:string,tx?:DbTx):Promise<number>;
 allocatePayment(input:{id:string;tenantId:string;branchId:string;partyType:PartyType;partyId:string;direction:'receive'|'pay';method:'cash'|'card'|'bank';amount:number;reference?:string|null},tx:DbTx):Promise<PaymentView>;
 listPayments(tenantId:string,partyType?:PartyType,partyId?:string):Promise<PaymentView[]>;
}