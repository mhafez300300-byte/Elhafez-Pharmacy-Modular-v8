import { AppError } from '../../../core/errors/app-error.js';

export type AccountType='asset'|'liability'|'equity'|'revenue'|'contra_revenue'|'expense'|'cogs';
export type AccountSeed=Readonly<{code:string;nameAr:string;type:AccountType;normalSide:'debit'|'credit'}>;

export const DEFAULT_CHART:readonly AccountSeed[]=[
  {code:'1100',nameAr:'الصندوق',type:'asset',normalSide:'debit'},
  {code:'1110',nameAr:'مدفوعات البطاقات',type:'asset',normalSide:'debit'},
  {code:'1120',nameAr:'البنوك',type:'asset',normalSide:'debit'},
  {code:'1200',nameAr:'ذمم العملاء',type:'asset',normalSide:'debit'},
  {code:'1210',nameAr:'أرصدة دائنة لدى الموردين',type:'asset',normalSide:'debit'},
  {code:'1300',nameAr:'المخزون',type:'asset',normalSide:'debit'},
  {code:'2100',nameAr:'ذمم الموردين',type:'liability',normalSide:'credit'},
  {code:'2130',nameAr:'ضريبة القيمة المضافة المستحقة',type:'liability',normalSide:'credit'},
  {code:'2140',nameAr:'أرصدة دائنة للعملاء',type:'liability',normalSide:'credit'},
  {code:'3100',nameAr:'حقوق الملكية',type:'equity',normalSide:'credit'},
  {code:'4100',nameAr:'إيراد المبيعات',type:'revenue',normalSide:'credit'},
  {code:'4190',nameAr:'مردودات ومسموحات المبيعات',type:'contra_revenue',normalSide:'debit'},
  {code:'5100',nameAr:'تكلفة البضاعة المباعة',type:'cogs',normalSide:'debit'},
  {code:'6100',nameAr:'المصروفات التشغيلية',type:'expense',normalSide:'debit'},
] as const;

export function assertPeriodRange(fromDate:string,toDate:string){
  const from=new Date(`${fromDate}T00:00:00Z`),to=new Date(`${toDate}T00:00:00Z`);
  if(Number.isNaN(from.getTime())||Number.isNaN(to.getTime())||from>to)throw new AppError('ACCOUNTING_PERIOD_INVALID','الفترة المحاسبية غير صحيحة',422);
}

export function statementBucket(type:AccountType){
  if(type==='revenue'||type==='contra_revenue'||type==='expense'||type==='cogs')return'income';
  return'balance';
}
