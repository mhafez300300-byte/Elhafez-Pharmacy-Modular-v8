import { api } from '../api/client.js';
import { h } from '../components/dom.js';

export async function auditPage(){
  const [verify,events]=await Promise.all([api<any>('/api/audit/verify'),api<any>('/api/audit?limit=300')]);
  const broken=!verify.ok;
  const status=h('section',{class:`card ${broken?'danger-zone':''}`},
    h('div',{class:'card-title'},h('div',{},h('h3',{},broken?'⚠ سجل التدقيق يحتاج تدخلاً':'✓ سجل التدقيق سليم'),h('small',{},broken?'لا تعتمد على سلامة العمليات الحساسة قبل مراجعة سبب الانقطاع.':'تم التحقق من سلسلة الأحداث المختومة.'))),
    h('div',{class:'grid two'},metric('الحالة',broken?'غير سليم':'سليم'),metric('أحداث مفحوصة',String(verify.checked??0)),metric('أحداث قديمة قبل التوقيع',String(verify.unhashed??0)),metric('نقطة الانقطاع',verify.firstBrokenId?'حدث يحتاج مراجعة':'لا يوجد')),
    broken?h('div',{class:'auth-note'},'إجراء مطلوب: راجع أول حدث متأثر، ثم شغّل المطابقة التشغيلية. لا يتم وصف النظام بأنه مستقر أثناء فشل هذا الفحص.'):null,
  );
  const table=h('div',{class:'table-wrap'},h('table',{class:'table'},h('thead',{},h('tr',{},...['الوقت','الإجراء','النوع','المرجع','سلامة البصمة'].map(x=>h('th',{},x)))),h('tbody')));
  for(const e of events.items??[])(table.querySelector('tbody')!).append(h('tr',{},h('td',{},fmt(e.createdAt)),h('td',{},actionLabel(e.action)),h('td',{},entityLabel(e.entity)),h('td',{},shortRef(e.entityId)),h('td',{},e.eventHash?'مختوم':'قديم قبل التوقيع')));
  return h('div',{},h('div',{class:'section-head'},h('div',{},h('h2',{},'سجل التدقيق'),h('p',{},'أثر رقابي للعمليات الحساسة بلغة تشغيلية واضحة'))),status,h('section',{class:'card',style:'margin-top:13px'},h('h3',{},'آخر الأحداث'),table));
}
function metric(t:string,v:string){return h('div',{class:'mini-metric'},h('small',{},t),h('strong',{},v));}
function fmt(x:string){try{return new Date(x).toLocaleString('ar-EG')}catch{return x}}
function shortRef(v:any){const s=String(v??'');return s?s.length>12?`…${s.slice(-8)}`:s:'—';}
function actionLabel(v:string){const m:Record<string,string>={'shift.opened':'فتح وردية','shift.closed':'إغلاق وردية','sale.created':'اعتماد بيع','sale.returned':'مرتجع بيع','purchase.received':'استلام شراء','purchase.returned':'مرتجع مورد'};return m[v]??String(v||'حدث تشغيلي').replaceAll('.',' ← ');}
function entityLabel(v:string){const m:Record<string,string>={cash_shift:'وردية',sale:'فاتورة بيع',sales_invoice:'فاتورة بيع',purchase_receipt:'استلام شراء',purchase_return:'مرتجع مورد',inventory:'مخزون'};return m[v]??'عملية تشغيلية';}
