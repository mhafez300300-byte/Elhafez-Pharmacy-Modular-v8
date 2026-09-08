import { api } from '../api/client.js';
import { h } from '../components/dom.js';

export async function auditPage(){
  const [verify,events]=await Promise.all([api<any>('/api/audit/verify'),api<any>('/api/audit?limit=300')]);
  const status=h('section',{class:`card ${verify.ok?'':'danger-zone'}`},
    h('h3',{},'سلامة سجل التدقيق'),
    h('div',{class:'grid two'},
      metric('الحالة',verify.ok?'سليم':'يحتاج مراجعة'),
      metric('أحداث مفحوصة',String(verify.checked??0)),
      metric('أحداث قديمة بلا بصمة',String(verify.unhashed??0)),
      metric('أول كسر في السلسلة',verify.firstBrokenId?String(verify.firstBrokenId):'لا يوجد'),
    ),
    h('p',{class:'muted'},'كل حدث جديد مرتبط ببصمة الحدث السابق. أي تعديل مباشر على سجل قديم يظهر في فحص السلسلة.'),
  );
  const table=h('div',{class:'table-wrap'},h('table',{class:'table'},h('thead',{},h('tr',{},...['الوقت','المستخدم','الإجراء','الكيان','المرجع','البصمة'].map(x=>h('th',{},x)))),h('tbody')));
  for(const e of events.items??[])(table.querySelector('tbody')!).append(h('tr',{},h('td',{},fmt(e.createdAt)),h('td',{},e.userId??'—'),h('td',{},e.action),h('td',{},e.entity),h('td',{},e.entityId??'—'),h('td',{},e.eventHash?`${String(e.eventHash).slice(0,12)}…`:'قديم')));
  return h('div',{},h('div',{class:'section-head'},h('div',{},h('h2',{},'سجل التدقيق'),h('p',{},'سجل تشغيلي غير قابل للعبث الصامت مع فحص Integrity'))),status,h('section',{class:'card',style:'margin-top:13px'},h('h3',{},'آخر الأحداث'),table));
}
function metric(t:string,v:string){return h('div',{class:'mini-metric'},h('small',{},t),h('strong',{},v));}function fmt(x:string){try{return new Date(x).toLocaleString('ar-EG')}catch{return x}}
