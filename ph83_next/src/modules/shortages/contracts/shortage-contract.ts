import type{DbTx}from'../../../core/db/types.js';
export type ShortageStatus='open'|'ordered'|'fulfilled'|'cancelled';
export type ShortageView=Readonly<{id:string;tenantId:string;branchId:string;productId:string|null;freeText:string|null;quantity:number;customerId:string|null;customerName:string|null;customerPhone:string|null;reason:string|null;note:string|null;status:ShortageStatus;source:string;createdBy:string;createdAt:string;updatedAt:string}>;
export interface ShortageContract{create(v:ShortageView,tx?:DbTx):Promise<ShortageView>;get(t:string,id:string,tx?:DbTx):Promise<ShortageView|null>;list(t:string,branchId?:string,status?:ShortageStatus,limit?:number):Promise<ShortageView[]>;updateStatus(t:string,id:string,status:ShortageStatus,tx?:DbTx):Promise<ShortageView>;}
