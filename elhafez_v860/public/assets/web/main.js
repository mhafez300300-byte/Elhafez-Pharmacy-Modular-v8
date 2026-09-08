import { api, post } from './api/client.js';
import { h, toast } from './components/dom.js';
import { state } from './state/store.js';
const mount = document.getElementById('app');
applyLocalUiPrefs();
function applyLocalUiPrefs() { try {
    const p = JSON.parse(localStorage.getItem('elhafez-ui-prefs') || '{}'), d = document.documentElement;
    d.dataset.theme = p.appearance || 'light';
    d.dataset.sidebarMode = p.sidebarMode || 'fixed';
    d.dataset.animations = p.animations === false ? 'off' : 'on';
    d.dataset.font = p.fontFamily || 'noto';
    if (p.accentColor)
        d.style.setProperty('--accent', String(p.accentColor));
    if (p.fontScale)
        d.style.setProperty('--font-scale', String(p.fontScale));
}
catch { } }
const lazy = (path, exportName) => async () => { const m = await import(path); return m[exportName](); };
const pages = {
    dashboard: lazy('./pages/dashboard.js', 'dashboardPage'), pos: lazy('./pages/pos.js', 'posPage'), sales: lazy('./pages/sales.js', 'salesPage'), products: lazy('./pages/products.js', 'productsPage'), imports: lazy('./pages/imports.js', 'importsPage'), inventory: lazy('./pages/inventory.js', 'inventoryPage'), replenishment: lazy('./pages/replenishment.js', 'replenishmentPage'), purchases: lazy('./pages/purchases.js', 'purchasesPage'), customers: async () => { const m = await import('./pages/parties.js'); return m.partiesPage('customers'); }, suppliers: async () => { const m = await import('./pages/parties.js'); return m.partiesPage('suppliers'); }, cash: lazy('./pages/cash.js', 'cashPage'), accounting: lazy('./pages/accounting.js', 'accountingPage'), reports: lazy('./pages/reports.js', 'reportsPage'), finance: lazy('./pages/finance.js', 'financePage'), clinical: lazy('./pages/clinical.js', 'clinicalPage'), pricing: lazy('./pages/pricing.js', 'pricingPage'), loyalty: lazy('./pages/loyalty.js', 'loyaltyPage'), notifications: lazy('./pages/notifications.js', 'notificationsPage'), audit: lazy('./pages/audit.js', 'auditPage'), reconciliation: lazy('./pages/reconciliation.js', 'reconciliationPage'), users: lazy('./pages/users.js', 'usersPage'), security: lazy('./pages/security.js', 'securityPage'), backup: lazy('./pages/backup.js', 'backupPage'), attendance: lazy('./pages/attendance.js', 'attendancePage'), settings: lazy('./pages/settings.js', 'settingsPage'), shortages: lazy('./pages/shortages.js', 'shortagesPage'), drug_master: lazy('./pages/drug-master.js', 'drugMasterPage'), expiry: lazy('./pages/expiry-center.js', 'expiryCenterPage'), insurance: lazy('./pages/insurance.js', 'insurancePage'), track_trace: lazy('./pages/track-trace.js', 'trackTracePage'), automation: lazy('./pages/automation.js', 'automationPage'), intelligence: lazy('./pages/intelligence.js', 'intelligencePage')
};
const labels = { dashboard: ['الرئيسية', 'ملخص الصيدلية'], pos: ['نقطة البيع', 'فاتورة بيع جديدة'], sales: ['المبيعات والمرتجعات', 'الفواتير والمرتجعات'], products: ['الأصناف', 'المنتجات والأسعار'], imports: ['استيراد البيانات', 'Excel وCSV مع معاينة قبل الاعتماد'], inventory: ['المخزون', 'الأرصدة والتشغيلات'], replenishment: ['إعادة الطلب الذكية', 'Push List وتغطية المخزون'], purchases: ['المشتريات', 'استلام مشتريات'], customers: ['العملاء', 'الحسابات المدينة'], suppliers: ['الموردون', 'إدارة الموردين'], cash: ['الخزينة والورديات', 'الحركة النقدية'], accounting: ['المحاسبة', 'القيود اليومية'], reports: ['التقارير', 'تحليل وتشغيل'], finance: ['الذمم والمصروفات', 'تحصيل وسداد ومصروفات'], clinical: ['السلامة الدوائية', 'روشتات وسحب وتداخلات'], pricing: ['الأسعار والعروض', 'عروض وتحديثات أسعار'], loyalty: ['برنامج الولاء', 'اكتساب واستبدال النقاط'], notifications: ['مركز التنبيهات', 'تنبيهات تشغيلية قابلة للتنفيذ'], audit: ['سجل التدقيق', 'سلامة وأثر كل العمليات الحساسة'], reconciliation: ['سلامة العمليات', 'مطابقة المستندات بالمخزون والخزينة والذمم والمحاسبة'], users: ['المستخدمون', 'الصلاحيات وحدود الخصم'], security: ['الأمان والجلسات', 'إدارة الأجهزة وتغيير PIN'], backup: ['النسخ الاحتياطي', 'فحص واستعادة مشفرة'], attendance: ['الحضور والانصراف', 'تسجيل ومراجعة الحضور'], settings: ['الإعدادات', 'بيانات الصيدلية'], shortages: ['كشكول النواقص', 'طلبات العملاء والأصناف غير المتوفرة'], drug_master: ['قاعدة الأدوية المركزية', 'بحث وتبنّي الأدوية إلى أصناف الصيدلية'], expiry: ['الصلاحية والتشغيلات', 'متابعة رأس المال المعرّض للانتهاء'], insurance: ['التأمين والتعاقدات', 'الخطط والمطالبات المرتبطة بالمبيعات'], track_trace: ['التتبع الدوائي', 'Track & Trace للتشغيلات والحركة'], intelligence: ['ذكاء الصيدلية', 'شراء وربحية ومخزون'], automation: ['مركز الأتمتة', 'السياسات التي يعمل بها النظام تلقائيًا'] };
const navItems = [['dashboard', 'الرئيسية', '⌂'], ['pos', 'نقطة البيع', '＋'], ['sales', 'المبيعات والمرتجعات', '↩'], ['products', 'الأصناف', 'Rx'], ['imports', 'استيراد البيانات', '⇧'], ['inventory', 'المخزون', '▦'], ['expiry', 'الصلاحية', '⌛'], ['replenishment', 'إعادة الطلب', '↑'], ['shortages', 'كشكول النواقص', '📝'], ['purchases', 'المشتريات', '⇣'], ['drug_master', 'قاعدة الأدوية', 'Rx'], ['customers', 'العملاء', '◎'], ['suppliers', 'الموردون', '◫'], ['cash', 'الخزينة والورديات', '¤'], ['accounting', 'المحاسبة', '≡'], ['finance', 'الذمم والمصروفات', '¤'], ['clinical', 'السلامة الدوائية', 'Rx'], ['pricing', 'الأسعار والعروض', '%'], ['loyalty', 'برنامج الولاء', '★'], ['insurance', 'التأمين والتعاقدات', '▣'], ['track_trace', 'التتبع الدوائي', '⌁'], ['intelligence', 'ذكاء الصيدلية', '◆'], ['automation', 'مركز الأتمتة', '⚡'], ['reports', 'التقارير', '▥'], ['notifications', 'التنبيهات', '!'], ['audit', 'سجل التدقيق', '✓'], ['reconciliation', 'سلامة العمليات', '≋'], ['users', 'المستخدمون', '♙'], ['security', 'الأمان والجلسات', '◉'], ['attendance', 'الحضور والانصراف', '◷'], ['backup', 'النسخ الاحتياطي', '⇩'], ['settings', 'الإعدادات', '⚙']];
const navGroups = { dashboard: 'اليوم', pos: 'اليوم', sales: 'اليوم', products: 'المخزون والتوريد', imports: 'المخزون والتوريد', inventory: 'المخزون والتوريد', expiry: 'المخزون والتوريد', replenishment: 'المخزون والتوريد', shortages: 'المخزون والتوريد', purchases: 'المخزون والتوريد', drug_master: 'المخزون والتوريد', customers: 'العلاقات والمال', suppliers: 'العلاقات والمال', cash: 'العلاقات والمال', accounting: 'الإدارة', finance: 'العلاقات والمال', clinical: 'الصيدلة الذكية', pricing: 'الصيدلة الذكية', loyalty: 'الصيدلة الذكية', insurance: 'العلاقات والمال', track_trace: 'الصيدلة الذكية', intelligence: 'الإدارة', automation: 'الإدارة', reports: 'الإدارة', notifications: 'الإدارة', audit: 'الإدارة', reconciliation: 'الإدارة', users: 'الإدارة', security: 'الإدارة', attendance: 'الإدارة', backup: 'الإدارة', settings: 'الإدارة' };
const pagePermissions = { dashboard: [], pos: ['sales.post'], sales: ['sales.manage'], products: ['catalog.read'], imports: ['imports.manage'], inventory: ['inventory.manage'], expiry: ['inventory.manage'], replenishment: ['purchases.read'], shortages: ['sales.manage'], purchases: ['purchases.read'], drug_master: ['catalog.read'], customers: ['customers.manage'], suppliers: ['suppliers.manage'], cash: ['cash.read'], accounting: ['reports.read'], finance: ['settlements.read'], clinical: ['clinical.read'], pricing: ['pricing.manage'], loyalty: ['loyalty.read'], insurance: ['sales.manage'], track_trace: ['inventory.manage'], intelligence: ['reports.read'], automation: ['reports.read'], reports: ['reports.read'], notifications: ['notifications.read'], audit: ['audit.read'], reconciliation: ['integrity.read'], users: ['users.manage'], security: [], attendance: ['attendance.read'], backup: ['backup.manage'], settings: ['settings.manage'] };
function canSeePage(page) { const needed = pagePermissions[page] ?? []; if (!needed.length)
    return true; const perms = new Set(state.user?.permissions ?? []); return needed.some(x => perms.has(x) || perms.has('*')); }
async function boot() { try {
    const setup = await api('/api/setup/status');
    if (!setup.configured)
        return renderSetup();
    try {
        const me = await api('/api/auth/me');
        state.user = me.user;
        const org = await api('/api/organization/me');
        state.branch = org.branch;
        renderApp();
    }
    catch {
        return renderLogin();
    }
}
catch (e) {
    renderFatal(e.message ?? 'تعذر تشغيل النظام');
} }
function brandStage() { return h('section', { class: 'auth-brand' }, h('div', { class: 'brand-mark' }, 'E'), h('div', {}, h('h1', {}, 'Elhafez ', h('span', {}, 'Pharmacy')), h('p', {}, 'نظام إدارة صيدليات مبني من الصفر بمعمارية Modular Monolith.')), h('div', { class: 'auth-brand-card' }, h('strong', {}, 'Commercial ERP / POS'), h('small', {}, 'بيع • مخزون • تشغيلات • صلاحية • مشتريات • محاسبة'))); }
function renderSetup() { mount.replaceChildren(h('main', { class: 'auth-page' }, h('div', { class: 'auth-shell' }, brandStage(), setupForm()))); }
function setupForm() { const form = h('form', { class: 'auth-form' }, h('div', {}, h('h2', {}, 'إعداد النظام لأول مرة'), h('p', { class: 'intro' }, 'أنشئ بيانات الصيدلية والفرع والمدير. هذه شاشة جديدة بالكامل وليست من النظام السابق.')), h('div', { class: 'form-grid' }, field('pharmacyName', 'اسم الصيدلية', 'صيدلية الحافظ', true), field('branchName', 'اسم الفرع', 'الفرع الرئيسي', true), field('adminName', 'اسم المدير', 'المدير', true), field('adminUsername', 'اسم المستخدم', 'admin', true), field('adminPin', 'PIN المدير', '', true, 'password'), selectField('currency', 'العملة', [['EGP', 'EGP'], ['SAR', 'SAR'], ['USD', 'USD']]), field('companyCode', 'كود الشركة من Owner Center (اختياري في وضع التجربة)', '')), h('div', { class: 'auth-note' }, 'في وضع التجربة المستقل لن يطلب منك النظام Setup Key مخفي أو كود غير ظاهر.'), h('div', { class: 'auth-actions' }, h('button', { class: 'btn primary block', type: 'submit' }, 'إنشاء النظام وبدء الاستخدام'))); form.onsubmit = async (e) => { e.preventDefault(); form.querySelector('.auth-error')?.remove(); const fd = new FormData(form); try {
    await post('/api/setup', Object.fromEntries(fd.entries()));
    toast('تم إنشاء النظام بنجاح');
    renderLogin();
}
catch (err) {
    const box = h('div', { class: 'auth-error' }, err.message ?? 'تعذر إنشاء النظام');
    form.insertBefore(box, form.children[1] ?? null);
} }; return form; }
function renderLogin() { const username = h('input', { name: 'username', autocomplete: 'username', value: 'admin', required: true }), pin = h('input', { name: 'pin', type: 'password', inputmode: 'numeric', autocomplete: 'current-password', required: true, maxLength: 8 }), form = h('form', { class: 'auth-form' }, h('div', {}, h('h2', {}, 'تسجيل الدخول'), h('p', { class: 'intro' }, 'أدخل حسابك للوصول إلى الصيدلية.')), h('div', { class: 'form-grid' }, labelControl('اسم المستخدم', username), labelControl('PIN', pin)), h('div', { class: 'auth-actions' }, h('button', { class: 'btn primary block', type: 'submit' }, 'دخول'))); form.onsubmit = async (e) => { e.preventDefault(); form.querySelector('.auth-error')?.remove(); try {
    const r = await post('/api/auth/login', { username: username.value, pin: pin.value });
    state.user = r.user;
    const org = await api('/api/organization/me');
    state.branch = org.branch;
    renderApp();
}
catch (err) {
    form.insertBefore(h('div', { class: 'auth-error' }, err.message ?? 'تعذر تسجيل الدخول'), form.children[1] ?? null);
} }; mount.replaceChildren(h('main', { class: 'auth-page' }, h('div', { class: 'auth-shell' }, brandStage(), form))); }
function renderApp() { const side = h('aside', { class: 'sidebar' }, h('div', { class: 'sidebar-brand' }, h('div', { class: 'brand-mark' }, 'E'), h('div', {}, h('strong', {}, 'Elhafez Pharmacy'), h('small', {}, 'v8.8.0 UAT CLEAN REMEDIATION'))), h('nav', { class: 'nav accordion-nav' }), h('div', { class: 'sidebar-footer' }, h('div', {}, state.user?.name ?? ''), h('div', {}, state.branch?.name ?? ''))); const nav = side.querySelector('.nav'); const visibleNav = navItems.filter(([p]) => canSeePage(p)); const groups = [...new Set(visibleNav.map(([p]) => navGroups[p] ?? ''))]; let openGroup = navGroups[state.page] ?? groups[0] ?? ''; const renderNav = () => { nav.replaceChildren(...groups.map(group => { const items = visibleNav.filter(([p]) => (navGroups[p] ?? '') === group), open = group === openGroup, box = h('div', { class: `nav-group ${open ? 'open' : ''}` }), header = h('button', { class: 'nav-group-toggle', type: 'button', 'aria-expanded': String(open), onClick: () => { openGroup = open ? '' : group; renderNav(); } }, h('span', { class: 'nav-group-title' }, group), h('span', { class: 'nav-chevron' }, '⌄')), body = h('div', { class: 'nav-group-items' }); for (const [p, l, g] of items)
    body.append(h('button', { type: 'button', 'data-page': p, class: state.page === p ? 'active' : '', onClick: () => void navigate(p) }, h('span', { class: 'nav-glyph' }, g), h('span', {}, l))); box.append(header, body); return box; })); }; renderNav(); const commandBtn = h('button', { class: 'btn sm command-button', type: 'button', onClick: () => openCommandPalette() }, '⌘ انتقال سريع'); const alertBtn = h('button', { class: 'btn sm alert-button', type: 'button', onClick: () => void navigate('notifications') }, 'تنبيهات', h('span', { class: 'alert-badge', id: 'alertBadge' }, '0')); const main = h('main', { class: 'main', id: 'mainContent', tabIndex: -1 }, h('header', { class: 'topbar' }, h('div', { style: 'display:flex;align-items:center;gap:10px' }, h('button', { class: 'btn sm mobile-menu', onClick: () => side.classList.toggle('open') }, '☰'), h('div', { class: 'page-title' }, h('strong', { id: 'pageTitle' }, ''), h('small', { id: 'pageSubtitle' }, ''))), h('div', { class: 'top-actions' }, h('span', { class: 'chip' }, state.branch?.name ?? 'بدون فرع'), commandBtn, alertBtn, h('button', { class: 'btn sm', onClick: async () => { await post('/api/auth/logout', {}).catch(() => { }); state.user = null; renderLogin(); } }, 'خروج'))), h('section', { class: 'content', id: 'pageContent' })); const skip = h('a', { class: 'skip-link', href: '#mainContent' }, 'تخطي إلى المحتوى'); mount.replaceChildren(skip, h('div', { class: 'app-layout' }, side, main)); void navigate(state.page); void refreshUnreadBadge(); }
function openCommandPalette() { const input = h('input', { class: 'search-input', placeholder: 'اكتب: بيع، مخزون، شراء، عميل، تقرير…', autofocus: true }), results = h('div', { class: 'command-results' }), backdrop = h('div', { class: 'modal-backdrop command-backdrop', onClick: (e) => { if (e.target === backdrop)
        backdrop.remove(); } }, h('div', { class: 'modal command-modal' }, h('div', { class: 'modal-head' }, h('div', {}, h('h3', {}, 'انتقال سريع'), h('small', { class: 'muted' }, 'اذهب لأي وظيفة بدون البحث في القوائم')), h('button', { class: 'icon-close', type: 'button', onClick: () => backdrop.remove() }, '×')), h('div', { class: 'modal-body' }, input, results))); const render = () => { const q = input.value.trim(); const list = navItems.filter(([p, l]) => canSeePage(p) && (!q || `${p} ${l} ${labels[p]?.join(' ') ?? ''}`.includes(q))).slice(0, 12); results.replaceChildren(...list.map(([p, l, g]) => h('button', { class: 'command-result', onClick: () => { backdrop.remove(); void navigate(p); } }, h('span', { class: 'command-glyph' }, g), h('span', {}, h('b', {}, l), h('small', {}, labels[p]?.[1] ?? '')), h('kbd', {}, '↵')))); }; input.oninput = render; input.onkeydown = (e) => { if (e.key === 'Escape')
    backdrop.remove(); if (e.key === 'Enter') {
    const first = results.querySelector('button');
    first?.click();
} }; render(); document.body.append(backdrop); setTimeout(() => input.focus(), 0); }
async function refreshUnreadBadge() { const badge = document.getElementById('alertBadge'); if (!badge)
    return; try {
    const d = await api('/api/notifications/unread-count');
    badge.textContent = String(d.count ?? 0);
    badge.classList.toggle('zero', !Number(d.count));
}
catch {
    badge.textContent = '0';
    badge.classList.add('zero');
} }
async function navigate(page) { state.page = page; document.querySelectorAll('.nav button').forEach(x => x.classList.toggle('active', x.dataset.page === page)); document.querySelector('.sidebar')?.classList.remove('open'); const [title, sub] = labels[page] ?? [page, '']; (document.getElementById('pageTitle')).textContent = title; (document.getElementById('pageSubtitle')).textContent = sub; const content = document.getElementById('pageContent'); content.replaceChildren(h('div', { class: 'empty' }, 'جاري التحميل…')); try {
    content.replaceChildren(await ((pages[page] ?? pages.dashboard))());
}
catch (e) {
    content.replaceChildren(h('div', { class: 'card' }, h('div', { class: 'auth-error' }, e.message ?? 'تعذر تحميل الصفحة')));
} void refreshUnreadBadge(); }
function field(name, label, value = '', required = false, type = 'text') { return labelControl(label, h('input', { name, value, required, type, inputmode: name === 'adminPin' ? 'numeric' : undefined, minLength: name === 'adminPin' ? 4 : undefined, maxLength: name === 'adminPin' ? 8 : undefined })); }
function selectField(name, label, items) { const s = h('select', { name }); for (const [v, l] of items)
    s.append(h('option', { value: v }, l)); return labelControl(label, s); }
function labelControl(text, control) { return h('label', { class: 'field' }, h('span', {}, text), control); }
function renderFatal(message) { mount.replaceChildren(h('main', { class: 'auth-page' }, h('section', { class: 'card', style: 'max-width:520px' }, h('h2', {}, 'تعذر تشغيل النظام'), h('p', { class: 'auth-error' }, message), h('button', { class: 'btn primary', onClick: () => location.reload() }, 'إعادة المحاولة')))); }
window.addEventListener('elhafez:navigate', (e) => { if (e.detail && pages[e.detail])
    void navigate(String(e.detail)); });
void boot();
