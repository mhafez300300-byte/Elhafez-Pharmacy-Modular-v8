import { api } from '../api/client.js';
import { h, money } from '../components/dom.js';
import { state } from '../state/store.js';

export async function reportsPage(){
  const branch=encodeURIComponent(state.branch?.id??'');
  const today=new Date(),from=h('input',{type:'date',value:new Date(today.getTime()-29*86400000).toISOString().slice(0,10)}),to=h('input',{type:'date',value:today.toISOString().slice(0,10)}),run=h('button',{class:'btn primary',type:'button'},'تحديث التقرير'),exportBtn=h('button',{class:'btn',type:'button'},'تصدير Excel/CSV'),printBtn=h('button',{class:'btn',type:'button'},'طباعة / PDF'),content=h('div'),stamp=h('small',{class:'muted'});
  let exportRows:string[][]=[];
  async function load(){run.setAttribute('disabled','');content.replaceChildren(h('div',{class:'loading-state',role:'status'},'جارٍ تجهيز التقارير…'));try{const q=`from=${encodeURIComponent(from.value)}&to=${encodeURIComponent(to.value)}`;const [sales,alerts,health,suppliers,balances,returns]=await Promise.all([
    api<any>(`/api/reports/sales?${q}`),api<any>(`/api/reports/stock-alerts?branchId=${branch}`),api<any>(`/api/reports/stock-health?branchId=${branch}`),api<any>('/api/reports/supplier-performance'),api<any>('/api/reports/party-balances'),api<any>(`/api/reports/returns?${q}`),
  ]);exportRows=[['التاريخ','عدد الفواتير','المبيعات','الربح'],...(sales.items??[]).map((x:any)=>[String(x.day).slice(0,10),String(x.invoices),String(x.total),sales.profitVisible===true?String(x.profit):''])];content.replaceChildren(
    h('div',{class:'grid two'},section('ملخص المبيعات',sales.items?.length?salesTable(sales.items,sales.profitVisible===true):empty('لا توجد مبيعات في الفترة.')),section('قرب انتهاء الصلاحية',alerts.items?.length?alertsTable(alerts.items):empty('لا توجد تنبيهات صلاحية.'))),
    section('صحة المخزون',health.items?.length?stockHealthTable(health.items,health.costVisible===true):empty('لا توجد أصناف.'),'section-gap'),
    h('div',{class:'grid two section-gap'},section('أداء الموردين',suppliers.items?.length?supplierTable(suppliers.items,suppliers.costVisible===true):empty('لا توجد بيانات موردين.')),section('أرصدة الأطراف',balanceTable(balances))),section('تحليل المرتجعات',returnTable(returns),'section-gap'));
    stamp.textContent=`آخر تحديث: ${new Date().toLocaleString('ar-EG')}`;
  }finally{run.removeAttribute('disabled')}}
  run.onclick=()=>void load();printBtn.onclick=()=>window.print();exportBtn.onclick=()=>downloadCsv(exportRows,`sales-report-${from.value}-${to.value}.csv`);
  const root=h('div',{},h('div',{class:'section-head'},h('div',{},h('h2',{},'التقارير التشغيلية'),h('p',{},'فلاتر زمنية + أرقام قابلة للتصدير والمراجعة')),h('div',{class:'section-actions'},h('label',{class:'field compact'},h('span',{},'من'),from),h('label',{class:'field compact'},h('span',{},'إلى'),to),run,exportBtn,printBtn)),stamp,content);await load();return root;
}
function section(title:string,body:HTMLElement,extra=''){return h('section',{class:`card ${extra}`.trim()},h('h3',{},title),body);}
function empty(text:string){return h('div',{class:'empty'},text);}
function salesTable(items:any[],profitVisible:boolean){return table(['اليوم','الفواتير','المبيعات','الربح'],items.map(x=>[String(x.day).slice(0,10),String(x.invoices),money(x.total),profitVisible?money(x.profit):'—']));}
function alertsTable(items:any[]){return table(['الصنف','التشغيلة','الصلاحية','الكمية'],items.map(x=>[x.name,x.batchNo??'—',x.expiryDate??'—',fmt(x.quantity)]));}
function stockHealthTable(items:any[],costVisible:boolean){return table(['الحالة','الصنف','المخزون','حد الطلب','بيع 30 يوم','قريب الصلاحية','منتهي','قيمة المخزون'],items.map(x=>[status(x.status),x.name,fmt(x.quantity),fmt(x.reorderLevel),fmt(x.sold30),fmt(x.expiringQty),fmt(x.expiredQty),costVisible?money(x.stockValue):'—']));}
function supplierTable(items:any[],costVisible:boolean){return table(['المورد','الفواتير','المشتريات','المرتجعات','المستحق','آخر شراء'],items.map(x=>[x.name,String(x.receipts),costVisible?money(x.total):'—',costVisible?money(x.returnsTotal):'—',money(x.payable),x.lastPurchaseAt?new Date(x.lastPurchaseAt).toLocaleDateString('ar-EG'):'—']));}
function balanceTable(d:any){const rows=[...(d.customers??[]).filter((x:any)=>x.balance>0).slice(0,10).map((x:any)=>['عميل',x.name,money(x.balance)]),...(d.suppliers??[]).filter((x:any)=>x.balance>0).slice(0,10).map((x:any)=>['مورد',x.name,money(x.balance)])];return rows.length?table(['النوع','الطرف','الرصيد'],rows):empty('لا توجد أرصدة مفتوحة.');}
function returnTable(d:any){const rows=(d.saleReturns??[]).map((x:any)=>[`مرتجع بيع — ${classification(x.classification)}`,String(x.returns),fmt(x.quantity),money(x.amount)]);rows.push(['مرتجع مورد',String(d.supplierReturns?.returns??0),'—',money(Number(d.supplierReturns?.amount??0))]);return table(['النوع','عدد المستندات','الكمية','القيمة'],rows);}
function table(headers:string[],rows:any[][]){const t=h('div',{class:'table-wrap'},h('table',{class:'table'},h('thead',{},h('tr',{},...headers.map(x=>h('th',{},x)))),h('tbody')));const b=t.querySelector('tbody')!;for(const row of rows)b.append(h('tr',{},...row.map(x=>h('td',{},String(x)) )));return t;}
function status(v:string){return v==='out'?'نفد':v==='low'?'منخفض':v==='slow'?'بطيء الحركة':'جيد';}
function classification(v:string){return v==='sellable'?'صالح للبيع':v==='quarantine'?'حجر':v==='damaged'?'تالف':v==='expired'?'منتهي':v;}
function fmt(v:number){return Number(v||0).toLocaleString('ar-EG',{maximumFractionDigits:2});}

function downloadCsv(rows:string[][],name:string){if(!rows.length)return;const esc=(v:string)=>`"${String(v??'').replaceAll('"','""')}"`;const csv='\ufeff'+rows.map(r=>r.map(esc).join(',')).join('\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
