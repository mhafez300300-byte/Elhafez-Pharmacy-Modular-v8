import { api, put, post } from '../api/client.js';
import { h, toast } from '../components/dom.js';
export async function settingsPage() {
    const [s, branches] = await Promise.all([api('/api/settings'), api('/api/organization/branches')]);
    const prefs = { defaultPaymentMethod: s?.preferences?.defaultPaymentMethod ?? 'cash', showProfitInPos: s?.preferences?.showProfitInPos !== false, autoFocusPosSearch: s?.preferences?.autoFocusPosSearch !== false, confirmBeforeSale: s?.preferences?.confirmBeforeSale === true, reorderSuggestionsEnabled: s?.preferences?.reorderSuggestionsEnabled !== false, lowStockCoverageDays: Number(s?.preferences?.lowStockCoverageDays ?? 14), expiryWarningDays: Number(s?.preferences?.expiryWarningDays ?? 90), paperSize: s?.preferences?.paperSize === '80mm' ? '80mm' : 'A4', dailyBriefEnabled: s?.preferences?.dailyBriefEnabled !== false, notifyLowStock: s?.preferences?.notifyLowStock !== false, notifyExpiry: s?.preferences?.notifyExpiry !== false, compactNavigation: s?.preferences?.compactNavigation === true };
    const root = h('div', { class: 'settings-page' }), head = h('div', { class: 'section-head' }, h('div', {}, h('h2', {}, 'مركز الإعدادات'), h('p', {}, 'تحكم في هوية الصيدلية وسلوك البيع والأتمتة والطباعة والتنبيهات من مكان واحد')));
    const tabs = h('div', { class: 'settings-tabs' }), body = h('div', { class: 'settings-body' });
    root.append(head, tabs, body);
    const sections = [
        ['general', 'عام', 'بيانات وهوية الصيدلية', () => generalSection(s)],
        ['sales', 'البيع', 'سلوك نقطة البيع', () => salesSection(prefs)],
        ['automation', 'المخزون والأتمتة', 'إعادة الطلب والصلاحيات', () => automationSection(prefs)],
        ['documents', 'الفواتير والطباعة', 'قالب وطباعة المستندات', () => documentsSection(s, prefs)],
        ['alerts', 'التنبيهات', 'ما الذي يلفت انتباهك', () => alertsSection(prefs)],
        ['branches', 'الفروع', 'إدارة فروع الصيدلية', () => branchesSection(branches)],
    ];
    let active = 'general';
    const render = () => { tabs.replaceChildren(...sections.map(([id, label, sub]) => h('button', { class: `settings-tab ${active === id ? 'active' : ''}`, type: 'button', onClick: () => { active = id; render(); } }, h('b', {}, label), h('small', {}, sub)))); const sec = sections.find(x => x[0] === active); body.replaceChildren(sec[3]()); };
    render();
    return root;
    function generalSection(data) { const form = h('form', { class: 'settings-panel form-grid' }, sectionTitle('بيانات الصيدلية', 'تظهر هذه البيانات في النظام والمستندات المطبوعة'), f('pharmacyName', 'اسم الصيدلية', data?.pharmacyName ?? '', true), f('phone', 'الهاتف', data?.phone ?? ''), f('whatsapp', 'واتساب', data?.whatsapp ?? ''), f('email', 'البريد الإلكتروني', data?.email ?? '', false, 'email'), f('address', 'العنوان', data?.address ?? ''), f('taxNumber', 'الرقم الضريبي', data?.taxNumber ?? ''), f('commercialRegistration', 'السجل التجاري', data?.commercialRegistration ?? ''), saveBar()); form.onsubmit = e => saveGeneral(e, form); return form; }
    function salesSection(p) { const payment = select('defaultPaymentMethod', 'طريقة الدفع الافتراضية', [['cash', 'نقدي'], ['card', 'بطاقة'], ['credit', 'آجل']], p.defaultPaymentMethod), profit = sw('showProfitInPos', 'إظهار هامش الربح في نقطة البيع', 'يظهر فقط للمستخدم الذي لديه صلاحية عرض الربح', p.showProfitInPos), focus = sw('autoFocusPosSearch', 'تركيز تلقائي على البحث', 'جاهز لمسح الباركود مباشرة عند فتح شاشة البيع', p.autoFocusPosSearch), confirmSale = sw('confirmBeforeSale', 'تأكيد قبل اعتماد البيع', 'يضيف خطوة تأكيد قبل إنشاء الفاتورة النهائية', p.confirmBeforeSale); const form = h('form', { class: 'settings-panel' }, sectionTitle('إعدادات نقطة البيع', 'اضبط السلوك الافتراضي للكاشير بدون تعديل منطق المبيعات'), h('div', { class: 'form-grid' }, payment.wrap), h('div', { class: 'settings-switches' }, profit.wrap, focus.wrap, confirmSale.wrap), saveBar()); form.onsubmit = e => savePrefs(e, form, { defaultPaymentMethod: payment.input.value, showProfitInPos: profit.input.checked, autoFocusPosSearch: focus.input.checked, confirmBeforeSale: confirmSale.input.checked }); return form; }
    function automationSection(p) { const enabled = sw('reorderSuggestionsEnabled', 'اقتراح إعادة الطلب تلقائيًا', 'يستخدم حركة البيع والمخزون لاقتراح ما يجب طلبه', p.reorderSuggestionsEnabled), coverage = nf('lowStockCoverageDays', 'تغطية المخزون المستهدفة بالأيام', p.lowStockCoverageDays, 1, 120), expiry = nf('expiryWarningDays', 'التنبيه قبل الصلاحية بعدد الأيام', p.expiryWarningDays, 7, 730); const form = h('form', { class: 'settings-panel' }, sectionTitle('المخزون والأتمتة', 'حوّل المتابعة اليومية إلى قواعد يراقبها النظام'), enabled.wrap, h('div', { class: 'form-grid' }, coverage, expiry), h('div', { class: 'settings-note' }, 'هذه القيم محفوظة كمصدر إعداد مركزي، وتستخدمها الواجهة في اقتراحات إعادة الطلب والتنبيهات بدل أرقام ثابتة.'), saveBar()); form.onsubmit = e => savePrefs(e, form, { reorderSuggestionsEnabled: enabled.input.checked, lowStockCoverageDays: Number(coverage.querySelector('input').value), expiryWarningDays: Number(expiry.querySelector('input').value) }); return form; }
    function documentsSection(data, p) { const paper = select('paperSize', 'مقاس الطباعة الافتراضي', [['A4', 'A4'], ['80mm', 'حراري 80mm']], p.paperSize), footer = textarea('invoiceFooter', 'ذيل الفاتورة', data?.invoiceFooter ?? ''); const form = h('form', { class: 'settings-panel' }, sectionTitle('الفواتير والطباعة', 'هوية موحدة للمستندات بدل تعديل كل قالب منفصل'), h('div', { class: 'form-grid' }, paper.wrap, footer), h('div', { class: 'settings-note' }, 'اسم الصيدلية والهاتف والعنوان والرقم الضريبي والسجل التجاري تؤخذ تلقائيًا من قسم «عام».'), saveBar()); form.onsubmit = async (e) => { e.preventDefault(); await saveAll({ invoiceFooter: footer.querySelector('textarea').value, preferences: { paperSize: paper.input.value } }); }; return form; }
    function alertsSection(p) { const brief = sw('dailyBriefEnabled', 'الملخص التنفيذي اليومي', 'يعرض أهم القرارات في الصفحة الرئيسية', p.dailyBriefEnabled), stock = sw('notifyLowStock', 'تنبيهات نقص المخزون', 'إظهار الأصناف التي تحتاج إعادة طلب', p.notifyLowStock), expiry = sw('notifyExpiry', 'تنبيهات الصلاحية', 'متابعة المنتهي والقريب من الانتهاء', p.notifyExpiry); const form = h('form', { class: 'settings-panel' }, sectionTitle('التنبيهات', 'حدد نوع المعلومات التي تستحق لفت انتباه المدير'), h('div', { class: 'settings-switches' }, brief.wrap, stock.wrap, expiry.wrap), saveBar()); form.onsubmit = e => savePrefs(e, form, { dailyBriefEnabled: brief.input.checked, notifyLowStock: stock.input.checked, notifyExpiry: expiry.input.checked }); return form; }
    function branchesSection(data) { const branchName = h('input', { placeholder: 'اسم الفرع الجديد' }), add = h('button', { class: 'btn primary', type: 'button' }, 'إضافة فرع'), list = h('div', { class: 'list' }, ...(data.items ?? []).map((b) => h('div', { class: 'list-row' }, h('span', {}, h('b', {}, b.name), h('small', { class: 'muted' }, b.id)), h('span', { class: `tag ${b.active ? 'success' : ''}` }, b.active ? 'نشط' : 'موقوف')))); add.onclick = async () => { try {
        if (branchName.value.trim().length < 2)
            return toast('اكتب اسم الفرع', true);
        const b = await post('/api/organization/branches', { name: branchName.value.trim() });
        list.append(h('div', { class: 'list-row' }, h('span', {}, h('b', {}, b.name)), h('span', { class: 'tag success' }, 'نشط')));
        branchName.value = '';
        toast('تمت إضافة الفرع');
    }
    catch (e) {
        toast(e.message, true);
    } }; return h('section', { class: 'settings-panel' }, sectionTitle('الفروع', 'الفروع جزء من Organization Module وليست بيانات عشوائية داخل الإعدادات'), list, h('div', { class: 'toolbar', style: 'margin-top:14px' }, branchName, add)); }
    async function saveGeneral(e, form) { e.preventDefault(); const fd = new FormData(form); await saveAll(Object.fromEntries(fd.entries())); }
    async function savePrefs(e, _form, partial) { e.preventDefault(); await saveAll({ preferences: partial }); }
    async function saveAll(partial) { try {
        const current = await api('/api/settings');
        await put('/api/settings', { pharmacyName: partial.pharmacyName ?? current.pharmacyName, phone: partial.phone ?? current.phone, address: partial.address ?? current.address, email: partial.email ?? current.email, whatsapp: partial.whatsapp ?? current.whatsapp, taxNumber: partial.taxNumber ?? current.taxNumber, commercialRegistration: partial.commercialRegistration ?? current.commercialRegistration, invoiceFooter: partial.invoiceFooter ?? current.invoiceFooter, preferences: { ...(current.preferences ?? {}), ...(partial.preferences ?? {}) } });
        toast('تم حفظ الإعدادات');
    }
    catch (err) {
        toast(err.message ?? 'تعذر حفظ الإعدادات', true);
    } }
}
function sectionTitle(title, sub) { return h('div', { class: 'settings-panel-head span-2' }, h('div', {}, h('h3', {}, title), h('p', {}, sub))); }
function saveBar() { return h('div', { class: 'settings-save span-2' }, h('button', { class: 'btn primary', type: 'submit' }, 'حفظ التغييرات')); }
function f(n, l, v, r = false, type = 'text') { return h('label', { class: 'field' }, h('span', {}, l), h('input', { name: n, value: v, required: r, type })); }
function nf(n, l, v, min, max) { return h('label', { class: 'field' }, h('span', {}, l), h('input', { name: n, type: 'number', value: String(v), min: String(min), max: String(max) })); }
function textarea(n, l, v) { return h('label', { class: 'field span-2' }, h('span', {}, l), h('textarea', { name: n, rows: 4, value: v })); }
function select(n, l, items, value) { const input = h('select', { name: n }); for (const [v, label] of items)
    input.append(h('option', { value: v, selected: v === value }, label)); return { input, wrap: h('label', { class: 'field' }, h('span', {}, l), input) }; }
function sw(n, title, sub, checked) { const input = h('input', { type: 'checkbox', name: n, checked }), wrap = h('label', { class: 'settings-switch' }, h('span', {}, h('b', {}, title), h('small', {}, sub)), h('span', { class: 'switch-ui' }, input, h('i'))); return { input, wrap }; }
