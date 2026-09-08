import type{DbTx}from'../../../core/db/types.js';
export type DoctorView=Readonly<{id:string;tenantId:string;name:string;phone:string|null;specialty:string|null;active:boolean}>;
export type PrescriptionView=Readonly<{id:string;tenantId:string;customerId:string|null;doctorId:string|null;code:string;issuedAt:string;expiresAt:string|null;status:'active'|'dispensed'|'cancelled';lines:ReadonlyArray<{id:string;productId:string;quantity:number;dose:string|null}>}>;
export type RecallView=Readonly<{id:string;tenantId:string;productId:string;batchNo:string|null;reason:string;severity:'warn'|'block';active:boolean;createdAt:string}>;
export interface ClinicalContract{
 createDoctor(v:DoctorView,tx?:DbTx):Promise<DoctorView>;listDoctors(t:string):Promise<DoctorView[]>;
 createPrescription(v:PrescriptionView,tx?:DbTx):Promise<PrescriptionView>;getPrescription(t:string,id:string,tx?:DbTx):Promise<PrescriptionView|null>;listPrescriptions(t:string,limit?:number):Promise<PrescriptionView[]>;
 createRecall(v:RecallView,tx?:DbTx):Promise<RecallView>;listRecalls(t:string,activeOnly?:boolean):Promise<RecallView[]>;
 createInteraction(input:{id:string;tenantId:string;productA:string;productB:string;severity:'warn'|'block';message:string},tx?:DbTx):Promise<void>;
 safetyCheck(t:string,items:ReadonlyArray<{productId:string;batchNos?:readonly(string|null)[]}>,tx?:DbTx):Promise<{blocked:boolean;warnings:ReadonlyArray<{type:'recall'|'interaction';severity:'warn'|'block';message:string;productIds:string[]}>}>;
}
