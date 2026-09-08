import { api, put } from '../api/client.js';
import { h, money, toast } from '../components/dom.js';
import { state } from '../state/store.js';
const can = (p) => !!state.user && (state.user.permissions.includes('*') || state.user.permissions.includes(p));
export async function loyaltyPage() {
    const root = h('div'), head = h('div', { class: 'section-head' }, h('div', {}, h('h2', {}, 'برنامج الولاء'), h('p', {}, 'قواعد اكتساب واستبدال النقاط مستقلة عن منطق البيع'))), card = h('section', { class: 'card' });
    root.append(head, card);
    const r = await api('/api/loyalty/rules/current'), rule = r.rule, form = h('form', { class: 'form-grid' }, lab('الحالة', sel('enabled', [["true", 'مفعّل'], ["false", 'متوقف']], String(rule.enabled))), inp('earnPointsPerCurrency', 'نقاط مكتسبة لكل 1 من العملة', String(rule.earnPointsPerCurrency), 'number', '0.01'), inp('pointValue', 'قيمة النقطة بالعملة', String(rule.pointValue), 'number', '0.0001'), inp('minRedeemPoints', 'الحد الأدنى للاستبدال', String(rule.minRedeemPoints), 'number', '1'), inp('maxRedeemPercent', 'أقصى نسبة من الفاتورة يمكن دفعها بالنقاط', String(rule.maxRedeemPercent), 'number', '0.1'), h('div', { class: 'notice' }, `مثال بالقواعد الحالية: 1000 EGP تمنح ${Math.floor(1000 * Number(rule.earnPointsPerCurrency))} نقطة، و100 نقطة تساوي تقريباً ${money(100 * Number(rule.pointValue))}.`), h('button', { class: 'btn primary', type: 'submit', disabled: !can('loyalty.manage') }, can('loyalty.manage') ? 'حفظ قواعد الولاء' : 'عرض فقط'));
    form.onsubmit = async (e) => { e.preventDefault(); if (!can('loyalty.manage'))
        return; const d = new FormData(form); try {
        await put('/api/loyalty/rules/current', { enabled: d.get('enabled') === 'true', earnPointsPerCurrency: Number(d.get('earnPointsPerCurrency')), pointValue: Number(d.get('pointValue')), minRedeemPoints: Number(d.get('minRedeemPoints')), maxRedeemPercent: Number(d.get('maxRedeemPercent')) });
        toast('تم حفظ قواعد الولاء');
    }
    catch (err) {
        toast(err.message ?? 'تعذر حفظ قواعد الولاء', true);
    } };
    card.append(form);
    return root;
}
function inp(n, t, v, type = 'text', step) { return lab(t, h('input', { name: n, type, value: v, min: type === 'number' ? '0' : undefined, max: n === 'maxRedeemPercent' ? '100' : undefined, step, required: true })); }
function lab(t, e) { return h('label', { class: 'field' }, h('span', {}, t), e); }
function sel(n, ops, value) { const s = h('select', { name: n }); for (const [o, l] of ops)
    s.append(h('option', { value: o, selected: o === value }, l)); return s; }
