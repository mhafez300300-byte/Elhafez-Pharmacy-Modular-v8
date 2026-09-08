import { api } from '../api/client.js';
import { h, toast } from '../components/dom.js';
import { state } from '../state/store.js';
export async function importsPage() {
    const root = h('div'), file = h('input', { type: 'file', accept: '.xlsx,.csv' }), kind = h('select'), branch = h('select'), previewBtn = h('button', { class: 'btn primary', type: 'button' }, 'معاينة الملف'), commitBtn = h('button', { class: 'btn', type: 'button', disabled: true }, 'اعتماد الاستيراد'), summary = h('div', { class: 'notice' }, 'اختر ملف XLSX أو CSV ثم اعمل معاينة. لن يتم حفظ أي شيء قبل الاعتماد.'), tableBox = h('section', { class: 'card' });
    for (const [v, l] of [['products', 'أصناف'], ['opening-stock', 'رصيد افتتاحي'], ['customers', 'عملاء'], ['suppliers', 'موردون']])
        kind.append(h('option', { value: v }, l));
    const org = await api('/api/organization/me');
    for (const b of org.branches ?? [])
        branch.append(h('option', { value: b.id, selected: b.id === state.branch?.id }, b.name));
    const form = h('section', { class: 'card' }, h('div', { class: 'section-head' }, h('div', {}, h('h2', {}, 'استيراد بيانات'), h('p', {}, 'معاينة وفحص كامل قبل أي كتابة في قاعدة البيانات'))), h('div', { class: 'form-grid' }, field('نوع البيانات', kind), field('الملف', file), field('الفرع (للرصيد الافتتاحي)', branch)), h('div', { class: 'section-actions' }, previewBtn, commitBtn), summary);
    root.append(form, tableBox);
    let current = null, last = null;
    async function send(mode) { current = file.files?.[0] ?? current; if (!current)
        return toast('اختر ملفاً أولاً', true); const q = new URLSearchParams({ kind: kind.value }); if (kind.value === 'opening-stock')
        q.set('branchId', branch.value); const r = await fetch(`/api/imports/${mode}?${q}`, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/octet-stream', 'x-file-name': current.name, ...(mode === 'commit' ? { 'x-import-confirm': 'IMPORT' } : {}) }, body: await current.arrayBuffer() }); const data = await r.json().catch(() => ({})); if (!r.ok)
        throw new Error(data.message ?? 'تعذر الاستيراد'); return data; }
    previewBtn.onclick = async () => { try {
        last = await send('preview');
        summary.textContent = `إجمالي ${last.total} • صالح ${last.valid} • أخطاء ${last.invalid}${last.truncated ? ' • المعروض أول 200 صف' : ''}`;
        summary.className = `notice ${last.invalid ? 'warning' : ''}`;
        commitBtn.disabled = last.invalid > 0 || last.valid === 0;
        render(last);
    }
    catch (e) {
        toast(e.message, true);
    } };
    commitBtn.onclick = async () => { if (!last || last.invalid)
        return; try {
        if (!confirm(`سيتم اعتماد ${last.valid} صف. هل تريد المتابعة؟`))
            return;
        const out = await send('commit');
        toast(`تم اعتماد ${out.count} صف بنجاح`);
        commitBtn.disabled = true;
        summary.textContent = `تم الاستيراد بنجاح — ${out.count} صف`;
    }
    catch (e) {
        toast(e.message, true);
    } };
    kind.onchange = () => { commitBtn.disabled = true; last = null; };
    function render(p) { if (!p.rows.length) {
        tableBox.replaceChildren(h('div', { class: 'empty' }, 'الملف لا يحتوي صفوفاً.'));
        return;
    } const keys = [...new Set(p.rows.flatMap(r => Object.keys(r.values ?? {})))], t = h('div', { class: 'table-wrap' }, h('table', { class: 'table' }, h('thead', {}, h('tr', {}, h('th', {}, '#'), h('th', {}, 'الحالة'), ...keys.map(k => h('th', {}, k)), h('th', {}, 'الأخطاء'))), h('tbody'))); for (const r of p.rows)
        (t.querySelector('tbody')).append(h('tr', {}, h('td', {}, String(r.rowNumber)), h('td', {}, r.errors?.length ? 'خطأ' : 'سليم'), ...keys.map(k => h('td', {}, String(r.values?.[k] ?? ''))), h('td', { class: r.errors?.length ? 'auth-error' : '' }, (r.errors ?? []).join(' • ')))); tableBox.replaceChildren(t); }
    return root;
}
function field(t, c) { return h('label', { class: 'field' }, h('span', {}, t), c); }
