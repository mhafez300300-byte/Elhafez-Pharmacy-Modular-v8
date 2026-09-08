import { api, put, post } from '../api/client.js';
import { h, toast } from '../components/dom.js';
export async function settingsPage() { const [s, branches] = await Promise.all([api('/api/settings'), api('/api/organization/branches')]); const form = h('form', { class: 'form-grid' }, f('pharmacyName', 'اسم الصيدلية', s?.pharmacyName ?? '', true), f('phone', 'الهاتف', s?.phone ?? ''), f('address', 'العنوان', s?.address ?? ''), f('invoiceFooter', 'ذيل الفاتورة', s?.invoiceFooter ?? '')); const btn = h('button', { class: 'btn primary', type: 'submit' }, 'حفظ الإعدادات'); form.append(h('div', { class: 'span-2' }, btn)); form.onsubmit = async (e) => { e.preventDefault(); const fd = new FormData(form); try {
    await put('/api/settings', Object.fromEntries(fd.entries()));
    toast('تم حفظ الإعدادات');
}
catch (err) {
    toast(err.message, true);
} }; const branchName = h('input', { placeholder: 'اسم الفرع الجديد' }), add = h('button', { class: 'btn primary', type: 'button' }, 'إضافة فرع'), list = h('div', { class: 'list' }, ...branches.items.map((b) => h('div', { class: 'list-row' }, h('span', {}, b.name), h('span', { class: `tag ${b.active ? 'success' : ''}` }, b.active ? 'نشط' : 'موقوف')))); add.onclick = async () => { try {
    if (branchName.value.trim().length < 2)
        return toast('اكتب اسم الفرع', true);
    const b = await post('/api/organization/branches', { name: branchName.value.trim() });
    list.append(h('div', { class: 'list-row' }, h('span', {}, b.name), h('span', { class: 'tag success' }, 'نشط')));
    branchName.value = '';
    toast('تمت إضافة الفرع');
}
catch (e) {
    toast(e.message, true);
} }; return h('div', {}, h('div', { class: 'section-head' }, h('div', {}, h('h2', {}, 'الإعدادات'), h('p', {}, 'بيانات الصيدلية والفروع والهوية المطبوعة'))), h('div', { class: 'grid two' }, h('section', { class: 'card' }, h('h3', {}, 'بيانات الصيدلية'), form), h('section', { class: 'card' }, h('h3', {}, 'الفروع'), list, h('div', { class: 'toolbar', style: 'margin-top:12px' }, branchName, add)))); }
function f(n, l, v, r = false) { return h('label', { class: 'field' }, h('span', {}, l), h('input', { name: n, value: v, required: r })); }
