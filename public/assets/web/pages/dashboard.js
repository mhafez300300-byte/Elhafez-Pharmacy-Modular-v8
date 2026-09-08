import { api } from '../api/client.js';
import { h, money } from '../components/dom.js';
import { state } from '../state/store.js';
const go = (page) => document.querySelector(`.nav button[data-page="${page}"]`)?.click();
export async function dashboardPage() {
    const branch = encodeURIComponent(state.branch?.id ?? '');
    const [data, health, balances, alerts, settings, auditIntegrity, reconciliation] = await Promise.all([
        api(`/api/reports/dashboard?branchId=${branch}`),
        api(`/api/reports/stock-health?branchId=${branch}`).catch(() => ({ items: [], costVisible: false })),
        api('/api/reports/party-balances').catch(() => ({ customers: [], suppliers: [] })),
        api('/api/notifications?limit=20').catch(() => ({ items: [] })),
        api('/api/settings').catch(() => ({ preferences: {} })),
        api('/api/audit/verify').catch(() => null),
        api(`/api/reconciliation?branchId=${branch}&limit=100`).catch(() => null),
    ]);
    const prefs = settings?.preferences ?? {}, expiryDays = Math.max(7, Number(prefs.expiryWarningDays ?? 90)), expiryLimit = Date.now() + expiryDays * 86400000;
    const items = health.items ?? [], out = items.filter(x => x.status === 'out'), low = items.filter(x => x.status === 'low'), slow = items.filter(x => x.status === 'slow'), exp = items.filter(x => Number(x.expiredQty) > 0 || (x.nearestExpiry != null && new Date(x.nearestExpiry).getTime() <= expiryLimit));
    const receivables = (balances.customers ?? []).reduce((s, x) => s + Number(x.balance ?? 0), 0), payables = (balances.suppliers ?? []).reduce((s, x) => s + Number(x.balance ?? 0), 0);
    const visibleOut = prefs.notifyLowStock === false ? [] : out, visibleLow = prefs.notifyLowStock === false ? [] : low, visibleExp = prefs.notifyExpiry === false ? [] : exp;
    const integrityFailed = (auditIntegrity && auditIntegrity.ok === false) || (reconciliation && reconciliation.ok === false);
    const actionCount = visibleOut.length + visibleLow.length + visibleExp.length + (alerts.items ?? []).filter((x) => !x.readAt).length;
    const root = h('div', { class: 'command-dashboard' });
    if (integrityFailed)
        root.append(h('button', { class: 'card danger-zone block', onClick: () => go(auditIntegrity?.ok === false ? 'audit' : 'reconciliation') }, h('strong', {}, '⚠ سلامة النظام تحتاج مراجعة'), h('div', { class: 'muted' }, auditIntegrity?.ok === false ? `سلسلة التدقيق غير سليمة${auditIntegrity.firstBrokenId ? ` — أول انقطاع: ${auditIntegrity.firstBrokenId}` : ''}` : `مطابقة العمليات بها ${reconciliation?.critical ?? 0} مشكلة حرجة`)));
    root.append(h('div', { class: 'hero-card' }, h('div', {}, h('span', { class: 'eyebrow' }, 'PHARMACY COMMAND CENTER'), h('h2', {}, greeting()), h('p', {}, integrityFailed ? 'تحذير حرج: سلامة سجل التدقيق أو مطابقة العمليات تحتاج مراجعة قبل الاعتماد على المؤشرات المالية.' : actionCount ? `لديك ${actionCount.toLocaleString('ar-EG')} نقطة تحتاج انتباهك. رتبتها لك حسب الأولوية.` : 'الصيدلية مستقرة حاليًا وفق الفحوص المتاحة.')), h('div', { class: 'hero-actions' }, quick('بيع جديد', 'pos', 'primary'), quick('اقتراح شراء', 'replenishment'), quick('تنبيهات', 'notifications'))), h('div', { class: 'grid kpi executive-kpis' }, kpi('مبيعات اليوم', money(data.todaySales?.total ?? 0), `${data.todaySales?.count ?? 0} فاتورة`, 'pos'), kpi('قيمة المخزون', data.costVisible ? money(data.stockValue ?? 0) : '—', data.costVisible ? 'رأس المال الحالي' : 'تحتاج صلاحية التكلفة', 'inventory'), kpi('مستحقات العملاء', money(receivables), 'قيمة تحتاج تحصيل', 'customers'), kpi('مستحقات الموردين', money(payables), 'قيمة تحتاج سداد', 'suppliers')), h('div', { class: 'grid two section-gap' }, actionCenter(visibleOut, visibleLow, visibleExp, slow), prefs.dailyBriefEnabled === false ? h('section', { class: 'card brief-card' }, h('div', { class: 'card-title' }, h('div', {}, h('h3', {}, 'الملخص التنفيذي متوقف'), h('small', {}, 'يمكن تشغيله من الإعدادات ← التنبيهات')))) : morningBrief(data, visibleOut, visibleLow, visibleExp, alerts.items ?? [])), h('div', { class: 'grid two section-gap' }, stockIntelligence(items, health.costVisible === true), automationPanel()));
    return root;
}
function greeting() { const h0 = new Date().getHours(); return h0 < 12 ? 'صباح الخير — هذه أهم قرارات اليوم' : h0 < 18 ? 'أهلاً بك — هذه حالة الصيدلية الآن' : 'مساء الخير — راجع أهم نقاط التشغيل قبل الإغلاق'; }
function quick(label, page, kind = '') { return h('button', { class: `btn ${kind}`, onClick: () => go(page) }, label); }
function kpi(label, value, sub, page) { return h('button', { class: 'card kpi-card executive-card', onClick: () => go(page) }, h('small', {}, label), h('strong', {}, value), h('em', {}, sub)); }
function actionCenter(out, low, exp, slow) {
    const section = h('section', { class: 'card decision-card' }, h('div', { class: 'card-title' }, h('div', {}, h('h3', {}, 'ما الذي يحتاج إجراء الآن؟'), h('small', {}, 'النظام حول البيانات إلى قرارات مرتبة حسب الأولوية'))));
    const rows = [
        { n: out.length, title: 'أصناف نفدت تمامًا', desc: 'قد تسبب فقد مبيعات الآن', page: 'replenishment', sev: 'danger', cta: 'أنشئ طلب شراء' },
        { n: low.length, title: 'أصناف وصلت لحد إعادة الطلب', desc: 'يفضل طلبها قبل النفاد', page: 'replenishment', sev: 'warning', cta: 'راجع المقترحات' },
        { n: exp.length, title: 'أصناف بها صلاحية تحتاج متابعة', desc: 'راجع المنتهي والقريب قبل خسارة رأس المال', page: 'inventory', sev: 'warning', cta: 'راجع الصلاحيات' },
        { n: slow.length, title: 'أصناف راكدة بدون مبيعات حديثة', desc: 'رأس مال متجمد يحتاج قرار تسعير أو تصريف', page: 'reports', sev: 'info', cta: 'حلل الراكد' },
    ];
    for (const r of rows)
        section.append(h('button', { class: 'decision-row', onClick: () => go(r.page) }, h('span', { class: `decision-count ${r.sev}` }, String(r.n)), h('span', { class: 'decision-copy' }, h('b', {}, r.title), h('small', {}, r.desc)), h('span', { class: 'decision-cta' }, r.cta, ' ←')));
    return section;
}
function morningBrief(data, out, low, exp, notifications) { const unread = notifications.filter(x => !x.readAt).length; return h('section', { class: 'card brief-card' }, h('div', { class: 'card-title' }, h('div', {}, h('h3', {}, 'الملخص التنفيذي'), h('small', {}, 'بدل ما تفتح 6 شاشات، اقرأ الصورة كاملة هنا'))), brief('المبيعات', `${data.todaySales?.count ?? 0} فاتورة بقيمة ${money(data.todaySales?.total ?? 0)}`), brief('الشراء', `${data.todayPurchases?.count ?? 0} استلام اليوم`), brief('المخزون', `${out.length} نافد • ${low.length} منخفض`), brief('الصلاحية', `${exp.length} صنف يحتاج متابعة`), brief('التنبيهات', `${unread} تنبيه غير مقروء`), h('button', { class: 'btn block section-gap', onClick: () => go('notifications') }, 'فتح مركز التنبيهات')); }
function brief(a, b) { return h('div', { class: 'brief-row' }, h('span', {}, a), h('strong', {}, b)); }
function stockIntelligence(items, costVisible) { const risky = items.filter(x => x.status !== 'healthy').slice(0, 7); const sec = h('section', { class: 'card' }, h('div', { class: 'card-title' }, h('div', {}, h('h3', {}, 'ذكاء المخزون'), h('small', {}, 'أعلى الأصناف التي تستحق قرارًا اليوم')))); if (!risky.length) {
    sec.append(h('div', { class: 'empty' }, 'لا توجد مشاكل مخزون ظاهرة.'));
    return sec;
} for (const x of risky)
    sec.append(h('button', { class: 'stock-intel-row', onClick: () => go(x.status === 'slow' ? 'reports' : 'inventory') }, h('div', {}, h('b', {}, x.name), h('small', {}, `${fmt(x.quantity)} متاح • بيع 30 يوم: ${fmt(x.sold30)}`)), h('div', { class: 'stock-intel-meta' }, h('span', { class: `tag ${x.status === 'out' ? 'danger' : x.status === 'low' ? 'warning' : ''}` }, x.status === 'out' ? 'نافد' : x.status === 'low' ? 'منخفض' : 'راكد'), costVisible && x.stockValue != null ? h('small', {}, money(x.stockValue)) : null))); return sec; }
function automationPanel() { return h('section', { class: 'card automation-card' }, h('div', { class: 'card-title' }, h('div', {}, h('h3', {}, 'Automation Engine'), h('small', {}, 'النظام يقوم بالأعمال الإدارية تلقائيًا عند الحدث'))), auto('اعتماد البيع', 'FEFO + المخزون + الخزينة + المحاسبة + Audit', 'يتم تلقائيًا'), auto('استلام الشراء', 'دفعات + تكلفة + مخزون + ذمة المورد + القيد', 'يتم تلقائيًا'), auto('انخفاض المخزون', 'احتساب الطلب المقترح من حركة البيع والتغطية', 'مراقبة مستمرة'), auto('تنبيهات التشغيل', 'نقص + صلاحية + ورديات + ذمم + سلامة العمليات', 'مراقبة مستمرة'), h('button', { class: 'btn block section-gap', onClick: () => go('replenishment') }, 'فتح اقتراحات إعادة الطلب')); }
function auto(a, b, c) { return h('div', { class: 'automation-row' }, h('span', { class: 'automation-dot' }, '✓'), h('div', {}, h('b', {}, a), h('small', {}, b)), h('em', {}, c)); }
function fmt(v) { return Number(v || 0).toLocaleString('ar-EG', { maximumFractionDigits: 1 }); }
