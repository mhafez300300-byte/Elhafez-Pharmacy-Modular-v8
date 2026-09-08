import type{DbTx}from'../../../core/db/types.js';
export type SettingsPreferences=Readonly<{
 defaultPaymentMethod:'cash'|'card'|'credit';showProfitInPos:boolean;autoFocusPosSearch:boolean;confirmBeforeSale:boolean;
 reorderSuggestionsEnabled:boolean;lowStockCoverageDays:number;expiryWarningDays:number;reorderSafetyDays:number;
 paperSize:'A4'|'80mm'|'58mm';dailyBriefEnabled:boolean;notifyLowStock:boolean;notifyExpiry:boolean;compactNavigation:boolean;
 appearance:'light'|'comfort'|'dark';accentColor:string;sidebarMode:'fixed'|'auto'|'hidden';animations:boolean;fontFamily:'cairo'|'tajawal'|'almarai'|'noto'|'plex';fontScale:number;
 receiptBusinessName:string;receiptPhone:string;receiptAddress:string;receiptTaxNumber:string;receiptCommercialRegister:string;receiptExtraInfo:string;receiptLogoData:string;
 receiptShowPhone:boolean;receiptShowAddress:boolean;receiptShowTaxNumber:boolean;receiptShowCommercialRegister:boolean;
 loyaltyEarnEvery:number;loyaltyRedeemValue:number;requireOpenShift:boolean;blindShiftClose:boolean;shiftVarianceTolerance:number;
 deviceName:string;receiptWidth:'80'|'58';taxIntegrationMode:'disabled'|'ready';
 shortageNotebookEnabled:boolean;customerRequestCaptureEnabled:boolean;autoCreateShortageFromPos:boolean;
 insuranceEnabled:boolean;insuranceDefaultCoveragePercent:number;claimsAutoDraft:boolean;trackTraceEnabled:boolean;trackTraceAutoSales:boolean;traceRequireBatchNo:boolean;
} >;
export type SettingsView=Readonly<{tenantId:string;pharmacyName:string;phone:string|null;address:string|null;email:string|null;whatsapp:string|null;taxNumber:string|null;commercialRegistration:string|null;invoiceFooter:string|null;preferences:SettingsPreferences}>;
export interface SettingsContract{get(tenantId:string,tx?:DbTx):Promise<SettingsView|null>;save(input:SettingsView,tx?:DbTx):Promise<SettingsView>;}
export const defaultSettingsPreferences:SettingsPreferences={
 defaultPaymentMethod:'cash',showProfitInPos:true,autoFocusPosSearch:true,confirmBeforeSale:false,
 reorderSuggestionsEnabled:true,lowStockCoverageDays:14,expiryWarningDays:90,reorderSafetyDays:3,
 paperSize:'A4',dailyBriefEnabled:true,notifyLowStock:true,notifyExpiry:true,compactNavigation:false,
 appearance:'light',accentColor:'#19b6b6',sidebarMode:'fixed',animations:true,fontFamily:'noto',fontScale:1,
 receiptBusinessName:'',receiptPhone:'',receiptAddress:'',receiptTaxNumber:'',receiptCommercialRegister:'',receiptExtraInfo:'',receiptLogoData:'',
 receiptShowPhone:true,receiptShowAddress:true,receiptShowTaxNumber:true,receiptShowCommercialRegister:true,
 loyaltyEarnEvery:10,loyaltyRedeemValue:.1,requireOpenShift:true,blindShiftClose:true,shiftVarianceTolerance:1,
 deviceName:'POS-01',receiptWidth:'80',taxIntegrationMode:'disabled',
 shortageNotebookEnabled:true,customerRequestCaptureEnabled:true,autoCreateShortageFromPos:true,
 insuranceEnabled:true,insuranceDefaultCoveragePercent:80,claimsAutoDraft:false,trackTraceEnabled:true,trackTraceAutoSales:true,traceRequireBatchNo:false,
};
