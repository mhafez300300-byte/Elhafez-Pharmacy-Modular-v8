import type{DbTx}from'../../../core/db/types.js';
export type InsuranceProvider=Readonly<{id:string;tenantId:string;name:string;code:string|null;phone:string|null;active:boolean;createdAt:string}>;
export type InsurancePlan=Readonly<{id:string;tenantId:string;providerId:string;name:string;coveragePercent:number;copayPercent:number;annualLimit:number|null;active:boolean}>;
export type InsuranceClaim=Readonly<{id:string;tenantId:string;saleId:string;customerId:string|null;providerId:string;planId:string|null;policyNumber:string|null;patientName:string|null;grossAmount:number;coveredAmount:number;patientAmount:number;status:'draft'|'submitted'|'approved'|'rejected'|'settled';referenceNo:string|null;note:string|null;createdAt:string;updatedAt:string}>;
export interface InsuranceContract{
 listProviders(tenantId:string):Promise<InsuranceProvider[]>;saveProvider(input:InsuranceProvider,tx?:DbTx):Promise<InsuranceProvider>;
 listPlans(tenantId:string,providerId?:string):Promise<InsurancePlan[]>;savePlan(input:InsurancePlan,tx?:DbTx):Promise<InsurancePlan>;
 listClaims(tenantId:string,limit?:number):Promise<InsuranceClaim[]>;getClaim(tenantId:string,id:string,tx?:DbTx):Promise<InsuranceClaim|null>;findBySale(tenantId:string,saleId:string,tx?:DbTx):Promise<InsuranceClaim|null>;
 saveClaim(input:InsuranceClaim,tx?:DbTx):Promise<InsuranceClaim>;updateClaimStatus(tenantId:string,id:string,status:InsuranceClaim['status'],referenceNo:string|null,note:string|null,tx?:DbTx):Promise<InsuranceClaim>;
}
