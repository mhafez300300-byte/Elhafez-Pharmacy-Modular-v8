export type GeneratedDocument=Readonly<{content:string|Uint8Array;contentType:string;filename:string}>;
export interface DocumentContract{
 salePrint(tenantId:string,saleId:string):Promise<GeneratedDocument>;
 salePdf(tenantId:string,saleId:string):Promise<GeneratedDocument>;
 saleExcel(tenantId:string,saleId:string):Promise<GeneratedDocument>;
 purchasePrint(tenantId:string,purchaseId:string):Promise<GeneratedDocument>;
 purchasePdf(tenantId:string,purchaseId:string):Promise<GeneratedDocument>;
 purchaseExcel(tenantId:string,purchaseId:string):Promise<GeneratedDocument>;
}
