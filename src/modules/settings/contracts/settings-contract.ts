import type{DbTx}from'../../../core/db/types.js';
export type SettingsPreferences=Readonly<{
 defaultPaymentMethod:'cash'|'card'|'credit';showProfitInPos:boolean;autoFocusPosSearch:boolean;confirmBeforeSale:boolean;
 reorderSuggestionsEnabled:boolean;lowStockCoverageDays:number;expiryWarningDays:number;
 paperSize:'A4'|'80mm';dailyBriefEnabled:boolean;notifyLowStock:boolean;notifyExpiry:boolean;
 compactNavigation:boolean;
}>;
export type SettingsView=Readonly<{tenantId:string;pharmacyName:string;phone:string|null;address:string|null;email:string|null;whatsapp:string|null;taxNumber:string|null;commercialRegistration:string|null;invoiceFooter:string|null;preferences:SettingsPreferences}>;
export interface SettingsContract{get(tenantId:string,tx?:DbTx):Promise<SettingsView|null>;save(input:SettingsView,tx?:DbTx):Promise<SettingsView>;}
export const defaultSettingsPreferences:SettingsPreferences={defaultPaymentMethod:'cash',showProfitInPos:true,autoFocusPosSearch:true,confirmBeforeSale:false,reorderSuggestionsEnabled:true,lowStockCoverageDays:14,expiryWarningDays:90,paperSize:'A4',dailyBriefEnabled:true,notifyLowStock:true,notifyExpiry:true,compactNavigation:false};
