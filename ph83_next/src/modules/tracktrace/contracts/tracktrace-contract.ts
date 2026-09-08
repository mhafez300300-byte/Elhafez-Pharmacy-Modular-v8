import type{DbTx}from'../../../core/db/types.js';
export type TraceEventType='received'|'dispensed'|'returned'|'quarantined'|'released'|'recalled'|'adjusted';
export type TraceEvent=Readonly<{id:string;tenantId:string;branchId:string;productId:string;batchId:string|null;batchNo:string|null;gtin:string|null;serialNumber:string|null;eventType:TraceEventType;quantity:number;sourceType:string;sourceId:string|null;note:string|null;userId:string|null;createdAt:string}>;
export interface TrackTraceContract{record(input:TraceEvent,tx?:DbTx):Promise<TraceEvent>;list(tenantId:string,branchId:string,query?:string,limit?:number):Promise<TraceEvent[]>;byBatch(tenantId:string,batchId:string,limit?:number):Promise<TraceEvent[]>;existsSource(tenantId:string,eventType:TraceEventType,sourceType:string,sourceId:string,batchId:string|null,tx?:DbTx):Promise<boolean>;}

export interface TrackTraceRecorder{recordDispense(tenantId:string,userId:string,input:{branchId:string;productId:string;batchId:string;batchNo?:string|null;quantity:number;saleId:string},tx:DbTx):Promise<void>;}
