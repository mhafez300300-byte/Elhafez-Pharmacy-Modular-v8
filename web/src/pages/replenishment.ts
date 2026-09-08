import { api } from '../api/client.js';
import { h } from '../components/dom.js';
import { state } from '../state/store.js';

type Item = {
  productId:string; productName:string; barcode:string|null; currentStock:number; reorderLevel:number;
  sold7:number; sold30:number; coverageDays:number|null; suggestedQuantity:number;
  priority:'critical'|'high'|'medium'|'none';
};

export async function replenishmentPage() {
  const root=h('div');
  const settings=await api<any>('/api/settings').catch(()=>({preferences:{}})),pref=settings?.preferences??{},preferred=Math.max(1,Number(pref.lowStockCoverageDays??21));
  const target=h('select');
  const options=[...new Set([14,21,30,45,preferred])].sort((a,b)=>a-b);
  for(const days of options)target.append(h('option',{value:String(days),selected:days===preferred},`${days} يوم تغطية`));
  const head=h('div',{class:'section-head'},h('div',{},h('h2',{},'Push List — إعادة الطلب'),h('p',{},pref.reorderSuggestionsEnabled===false?'الأتمتة متوقفة من الإعدادات — يمكنك المراجعة اليدوية هنا':'اقتراح شراء من المبيعات الفعلية والمخزون وحد إعادة الطلب')),target);
  const summary=h('div',{class:'grid kpis'}),box=h('section',{class:'card section-gap'});root.append(head,summary,box);
  async function load(){const d=await api<any>(`/api/replenishment/recommendations?branchId=${encodeURIComponent(state.branch?.id??'')}&targetDays=${target.value}`);const items:Item[]=d.items??[];summary.replaceChildren(kpi('أصناف تحتاج طلب',String(d.actionable??0)),kpi('حرج',String(items.filter(x=>x.priority==='critical').length)),kpi('مرتفع',String(items.filter(x=>x.priority==='high').length)),kpi('إجمالي مقترح',fmt(items.reduce((a,x)=>a+x.suggestedQuantity,0))));const actionable=items.filter(x=>x.suggestedQuantity>0);box.replaceChildren(h('div',{class:'card-title'},h('h3',{},'قائمة الأولوية')),actionable.length?table(actionable):h('div',{class:'empty'},'المخزون الحالي لا يحتاج إعادة طلب حسب البيانات المتاحة.'));}
  target.onchange=()=>void load();await load();return root;
}
function kpi(label:string,value:string){return h('div',{class:'card kpi'},h('small',{},label),h('strong',{},value));}
function table(items:Item[]){const t=h('div',{class:'table-wrap'},h('table',{class:'table'},h('thead',{},h('tr',{},...['الأولوية','الصنف','المخزون','حد الطلب','بيع 7 أيام','بيع 30 يوم','التغطية','الكمية المقترحة'].map(x=>h('th',{},x)))),h('tbody')));const b=t.querySelector('tbody')!;for(const x of items)b.append(h('tr',{},h('td',{},priority(x.priority)),h('td',{},h('strong',{},x.productName),x.barcode?h('small',{class:'cell-sub'},x.barcode):''),h('td',{},fmt(x.currentStock)),h('td',{},fmt(x.reorderLevel)),h('td',{},fmt(x.sold7)),h('td',{},fmt(x.sold30)),h('td',{},x.coverageDays==null?'لا توجد مبيعات':`${x.coverageDays.toFixed(1)} يوم`),h('td',{},h('strong',{},fmt(x.suggestedQuantity)))));return t;}
function priority(p:Item['priority']){return p==='critical'?'حرج':p==='high'?'مرتفع':p==='medium'?'متوسط':'طبيعي';}
function fmt(v:number){return Number(v||0).toLocaleString('ar-EG',{maximumFractionDigits:2});}
