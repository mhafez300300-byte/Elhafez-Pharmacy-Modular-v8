import { api, post } from '../api/client.js';
import { h, modal, toast, money } from '../components/dom.js';
export async function partiesPage(kind) {
    const isCustomer = kind === 'customers', title = isCustomer ? 'العملاء' : 'الموردون';
    const root = h('div'), head = h('div', { class: 'section-head' }, h('div', {}, h('h2', {}, title), h('p', {}, isCustomer ? 'إدارة العملاء والبيع الآجل وملف 360' : 'إدارة الموردين والذمم وملف 360')), h('button', { class: 'btn primary' }, `+ ${isCustomer ? 'عميل' : 'مورد'} جديد`));
    const card = h('section', { class: 'card' }), search = h('input', { class: 'search-input', placeholder: `بحث في ${title}` }), table = h('div', { class: 'table-wrap' }), detail = h('section', { class: 'card section-gap hidden' });
    card.append(h('div', { class: 'toolbar' }, search), table);
    root.append(head, card, detail);
    async function open360(id) { try {
        const d = await api(`/api/party360/${kind}/${id}`);
        detail.classList.remove('hidden');
        detail.replaceChildren(render360(d, isCustomer));
        detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    catch (e) {
        toast(e.message ?? 'تعذر تحميل ملف 360', true);
    } }
    async function load() { const d = await api(`/api/${kind}?q=${encodeURIComponent(search.value)}`); table.replaceChildren(d.items?.length ? render(d.items, isCustomer, open360) : h('div', { class: 'empty' }, `لا يوجد ${title} بعد.`)); }
    search.oninput = () => void load();
    head.querySelector('.primary').onclick = () => { const body = h('div', { class: 'form-grid' }, f('name', 'الاسم', true), f('phone', 'الهاتف'), ...(isCustomer ? [f('creditLimit', 'حد الائتمان', false, 'number')] : [])); modal(`إضافة ${isCustomer ? 'عميل' : 'مورد'}`, body, async (form) => { const fd = new FormData(form); await post(`/api/${kind}`, { name: fd.get('name'), phone: fd.get('phone'), ...(isCustomer ? { creditLimit: Number(fd.get('creditLimit') || 0) } : {}) }); toast('تم الحفظ'); await load(); }); };
    await load();
    return root;
}
function render(items, customer, open360) { const t = h('table', { class: 'table' }, h('thead', {}, h('tr', {}, h('th', {}, 'الاسم'), h('th', {}, 'الهاتف'), ...(customer ? [h('th', {}, 'حد الائتمان')] : []), h('th', {}, 'الحالة'), h('th', {}, ''))), h('tbody')); for (const x of items)
    t.tBodies[0].append(h('tr', {}, h('td', {}, x.name), h('td', {}, x.phone ?? '—'), ...(customer ? [h('td', {}, money(Number(x.creditLimit ?? 0)))] : []), h('td', {}, h('span', { class: 'tag success' }, x.active ? 'نشط' : 'موقوف')), h('td', {}, h('button', { class: 'btn tiny', onClick: () => void open360(x.id) }, '360')))); return t; }
function render360(d, customer) {
    const party = d.party;
    const kpis = customer
        ? [['الرصيد المستحق', d.outstanding], ['الائتمان المتاح', d.availableCredit], ['إجمالي المبيعات', d.salesTotal], ['إجمالي التحصيل', d.receivedTotal]]
        : [['الرصيد المستحق', d.outstanding], ['إجمالي المشتريات', d.purchasesTotal], ['إجمالي السداد', d.paidTotal], ['آخر نشاط', d.lastActivityAt ? new Date(d.lastActivityAt).toLocaleDateString('ar-EG') : '—']];
    const cards = kpis.map(([label, value]) => h('div', { class: 'card kpi' }, h('small', {}, label), h('strong', {}, typeof value === 'number' ? money(value) : String(value))));
    return h('div', {}, h('div', { class: 'card-title' }, h('div', {}, h('h3', {}, `${party.name} — 360`), h('small', {}, party.phone ?? 'بدون هاتف'))), h('div', { class: 'grid kpis' }, ...cards), h('div', { class: 'grid two section-gap' }, h('div', {}, h('h3', {}, customer ? 'آخر المبيعات' : 'آخر المشتريات'), docsTable(customer ? d.sales : d.purchases)), h('div', {}, h('h3', {}, 'الذمم والسداد'), financeTable(d.obligations, d.payments))));
}
function docsTable(items) { if (!items?.length)
    return h('div', { class: 'empty' }, 'لا توجد مستندات.'); const t = h('div', { class: 'table-wrap' }, h('table', { class: 'table' }, h('thead', {}, h('tr', {}, h('th', {}, 'المستند'), h('th', {}, 'التاريخ'), h('th', {}, 'القيمة'))), h('tbody'))); for (const x of items.slice(0, 20))
    (t.querySelector('tbody')).append(h('tr', {}, h('td', {}, x.number ?? x.id), h('td', {}, new Date(x.createdAt).toLocaleDateString('ar-EG')), h('td', {}, money(Number(x.total ?? 0))))); return t; }
function financeTable(ob, pay) { const rows = [...(ob ?? []).slice(0, 10).map((x) => ({ kind: 'استحقاق', date: x.createdAt, value: x.balance })), ...(pay ?? []).slice(0, 10).map((x) => ({ kind: 'سداد', date: x.createdAt, value: x.amount }))].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 15); if (!rows.length)
    return h('div', { class: 'empty' }, 'لا توجد حركة ذمم.'); const t = h('div', { class: 'table-wrap' }, h('table', { class: 'table' }, h('thead', {}, h('tr', {}, h('th', {}, 'النوع'), h('th', {}, 'التاريخ'), h('th', {}, 'القيمة'))), h('tbody'))); for (const x of rows)
    (t.querySelector('tbody')).append(h('tr', {}, h('td', {}, x.kind), h('td', {}, new Date(x.date).toLocaleDateString('ar-EG')), h('td', {}, money(Number(x.value))))); return t; }
function f(name, label, required = false, type = 'text') { return h('label', { class: 'field' }, h('span', {}, label), h('input', { name, type, required, min: type === 'number' ? '0' : undefined, step: type === 'number' ? '0.01' : undefined })); }
