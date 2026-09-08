import { api } from '../api/client.js';
import { h, money } from '../components/dom.js';
import { state } from '../state/store.js';
export async function reportsPage() {
    const branch = encodeURIComponent(state.branch?.id ?? '');
    const [sales, alerts, health, suppliers, balances, returns] = await Promise.all([
        api('/api/reports/sales'), api(`/api/reports/stock-alerts?branchId=${branch}`), api(`/api/reports/stock-health?branchId=${branch}`), api('/api/reports/supplier-performance'), api('/api/reports/party-balances'), api('/api/reports/returns'),
    ]);
    return h('div', {}, h('div', { class: 'section-head' }, h('div', {}, h('h2', {}, 'التقارير الاحترافية'), h('p', {}, 'مبيعات، صحة مخزون، موردون، ذمم ومرتجعات من بيانات النظام الفعلية'))), h('div', { class: 'grid two' }, section('ملخص المبيعات اليومي', sales.items?.length ? salesTable(sales.items, sales.profitVisible === true) : empty('لا توجد مبيعات بعد.')), section('قرب انتهاء الصلاحية', alerts.items?.length ? alertsTable(alerts.items) : empty('لا توجد تنبيهات صلاحية.'))), section('صحة المخزون', health.items?.length ? stockHealthTable(health.items, health.costVisible === true) : empty('لا توجد أصناف.'), 'section-gap'), h('div', { class: 'grid two section-gap' }, section('أداء الموردين', suppliers.items?.length ? supplierTable(suppliers.items, suppliers.costVisible === true) : empty('لا توجد بيانات موردين.')), section('أرصدة الأطراف', balanceTable(balances))), section('تحليل المرتجعات', returnTable(returns), 'section-gap'));
}
function section(title, body, extra = '') { return h('section', { class: `card ${extra}`.trim() }, h('h3', {}, title), body); }
function empty(text) { return h('div', { class: 'empty' }, text); }
function salesTable(items, profitVisible) { return table(['اليوم', 'الفواتير', 'المبيعات', 'الربح'], items.map(x => [String(x.day).slice(0, 10), String(x.invoices), money(x.total), profitVisible ? money(x.profit) : '—'])); }
function alertsTable(items) { return table(['الصنف', 'التشغيلة', 'الصلاحية', 'الكمية'], items.map(x => [x.name, x.batchNo ?? '—', x.expiryDate ?? '—', fmt(x.quantity)])); }
function stockHealthTable(items, costVisible) { return table(['الحالة', 'الصنف', 'المخزون', 'حد الطلب', 'بيع 30 يوم', 'قريب الصلاحية', 'منتهي', 'قيمة المخزون'], items.map(x => [status(x.status), x.name, fmt(x.quantity), fmt(x.reorderLevel), fmt(x.sold30), fmt(x.expiringQty), fmt(x.expiredQty), costVisible ? money(x.stockValue) : '—'])); }
function supplierTable(items, costVisible) { return table(['المورد', 'الفواتير', 'المشتريات', 'المرتجعات', 'المستحق', 'آخر شراء'], items.map(x => [x.name, String(x.receipts), costVisible ? money(x.total) : '—', costVisible ? money(x.returnsTotal) : '—', money(x.payable), x.lastPurchaseAt ? new Date(x.lastPurchaseAt).toLocaleDateString('ar-EG') : '—'])); }
function balanceTable(d) { const rows = [...(d.customers ?? []).filter((x) => x.balance > 0).slice(0, 10).map((x) => ['عميل', x.name, money(x.balance)]), ...(d.suppliers ?? []).filter((x) => x.balance > 0).slice(0, 10).map((x) => ['مورد', x.name, money(x.balance)])]; return rows.length ? table(['النوع', 'الطرف', 'الرصيد'], rows) : empty('لا توجد أرصدة مفتوحة.'); }
function returnTable(d) { const rows = (d.saleReturns ?? []).map((x) => [`مرتجع بيع — ${classification(x.classification)}`, String(x.returns), fmt(x.quantity), money(x.amount)]); rows.push(['مرتجع مورد', String(d.supplierReturns?.returns ?? 0), '—', money(Number(d.supplierReturns?.amount ?? 0))]); return table(['النوع', 'عدد المستندات', 'الكمية', 'القيمة'], rows); }
function table(headers, rows) { const t = h('div', { class: 'table-wrap' }, h('table', { class: 'table' }, h('thead', {}, h('tr', {}, ...headers.map(x => h('th', {}, x)))), h('tbody'))); const b = t.querySelector('tbody'); for (const row of rows)
    b.append(h('tr', {}, ...row.map(x => h('td', {}, String(x))))); return t; }
function status(v) { return v === 'out' ? 'نفد' : v === 'low' ? 'منخفض' : v === 'slow' ? 'بطيء الحركة' : 'جيد'; }
function classification(v) { return v === 'sellable' ? 'صالح للبيع' : v === 'quarantine' ? 'حجر' : v === 'damaged' ? 'تالف' : v === 'expired' ? 'منتهي' : v; }
function fmt(v) { return Number(v || 0).toLocaleString('ar-EG', { maximumFractionDigits: 2 }); }
