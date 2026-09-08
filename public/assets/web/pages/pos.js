import { api, post } from '../api/client.js';
import { h, money, toast, modal } from '../components/dom.js';
import { state } from '../state/store.js';
const can = (p) => !!state.user && (state.user.permissions.includes('*') || state.user.permissions.includes(p));
export async function posPage() {
    const root = h('div'), cart = [];
    let products = [], customers = [], prescriptions = [], loyalty = null, lastAttemptFingerprint = '', lastAttemptKey = '', searchTimer;
    const canProfit = can('profit.view'), canLoyaltyRead = can('loyalty.read'), canRedeem = can('loyalty.redeem'), canCreditOverride = can('sales.credit.override'), canSettlementRead = can('settlements.read');
    const suspendBtn = h('button', { class: 'btn', type: 'button' }, 'تعليق الفاتورة'), draftsBtn = h('button', { class: 'btn', type: 'button' }, 'الفواتير المعلقة');
    const head = h('div', { class: 'section-head' }, h('div', {}, h('h2', {}, 'نقطة البيع'), h('p', {}, 'بيع ذري • FEFO • باركود • تعليق واسترجاع • ولاء')), h('div', { class: 'section-actions' }, draftsBtn, suspendBtn)), layout = h('div', { class: 'pos-layout' }), productsCard = h('section', { class: 'card pos-products' }), cartCard = h('section', { class: 'card' }), search = h('input', { class: 'search-input', placeholder: 'ابحث بالاسم أو امسح الباركود', autocomplete: 'off' }), grid = h('div', { class: 'product-grid', style: 'margin-top:12px' }), cartBox = h('div', { class: 'cart' }), customer = h('select'), payment = h('select'), prescription = h('select'), rxField = label('الروشتة', prescription), invoiceDiscount = h('input', { type: 'number', min: '0', step: '0.01', value: '0' }), loyaltyPoints = h('input', { type: 'number', min: '0', step: '1', value: '0' }), loyaltyInfo = h('small', { class: 'muted' }, 'اختر عميلاً لعرض نقاط الولاء'), loyaltyField = label('استبدال نقاط الولاء', h('div', {}, loyaltyPoints, loyaltyInfo)), creditOverride = h('input', { placeholder: 'سبب تجاوز حد الائتمان عند موافقة المدير' }), creditInfo = h('small', { class: 'muted' }, ''), creditField = label('تجاوز حد الائتمان', h('div', {}, creditOverride, creditInfo)), totals = h('div', { class: 'totals' }), profitHint = h('div', { class: 'notice', style: 'display:none;margin-top:10px' }), submit = h('button', { class: 'btn primary block' }, 'اعتماد البيع');
    customer.append(h('option', { value: '' }, 'عميل نقدي'));
    payment.append(h('option', { value: 'cash' }, 'نقدي'), h('option', { value: 'card' }, 'بطاقة'), h('option', { value: 'credit' }, 'آجل'));
    prescription.append(h('option', { value: '' }, 'اختر روشتة عند الحاجة'));
    loyaltyField.style.display = canLoyaltyRead ? 'grid' : 'none';
    loyaltyPoints.disabled = !canRedeem;
    creditField.style.display = 'none';
    productsCard.append(h('div', { class: 'toolbar' }, search), grid);
    cartCard.append(h('h3', {}, 'الفاتورة الحالية'), cartBox, h('div', { class: 'form-grid', style: 'margin-top:12px' }, label('العميل', customer), label('الدفع', payment), rxField, label('خصم الفاتورة', invoiceDiscount), loyaltyField, creditField), totals, profitHint, submit);
    layout.append(productsCard, cartCard);
    root.append(head, layout);
    const [data, balancesData, appSettings] = await Promise.all([api('/api/products?limit=100'), api(`/api/inventory/balances?branchId=${encodeURIComponent(state.branch?.id ?? '')}`).catch(() => ({ items: [] })), api('/api/settings').catch(() => ({ preferences: {} }))]);
    const posPrefs = appSettings?.preferences ?? {};
    payment.value = ['cash', 'card', 'credit'].includes(posPrefs.defaultPaymentMethod) ? posPrefs.defaultPaymentMethod : 'cash';
    const balanceMap = new Map((balancesData.items ?? []).map((x) => [x.productId, x]));
    products = data.items.map((p) => ({ ...p, stock: Number(balanceMap.get(p.id)?.quantity ?? 0), nearestExpiry: balanceMap.get(p.id)?.nearestExpiry ?? null }));
    customers = (await api('/api/customers')).items;
    prescriptions = (await api('/api/clinical/sale-prescriptions').catch(() => ({ items: [] }))).items;
    for (const c of customers)
        customer.append(h('option', { value: c.id }, c.name));
    for (const rx of prescriptions)
        prescription.append(h('option', { value: rx.id }, `روشتة ${String(rx.id).slice(-6)}${rx.expiresAt ? ' — ' + new Date(rx.expiresAt).toLocaleDateString('ar-EG') : ''}`));
    const add = (p) => { const line = cart.find(x => x.product.id === p.id); if (line)
        line.quantity++;
    else
        cart.push({ product: p, quantity: 1 }); renderCart(); };
    function renderProducts() { grid.replaceChildren(...products.slice(0, 60).map(p => h('button', { class: `product-tile ${Number(p.stock ?? 0) <= 0 ? 'out' : ''}`, disabled: Number(p.stock ?? 0) <= 0, onClick: () => add(p) }, h('b', {}, p.name), h('small', {}, p.barcode ?? 'بدون باركود'), h('span', { class: 'stock-hint' }, `الرصيد ${Number(p.stock ?? 0).toLocaleString('ar-EG')}${p.nearestExpiry ? ' • صلاحية ' + new Date(p.nearestExpiry).toLocaleDateString('ar-EG') : ''}`), h('div', { class: 'tile-meta' }, h('strong', {}, money(p.sellingPrice)), p.requiresPrescription ? h('span', { class: 'tag warning' }, 'Rx') : null)))); if (!products.length)
        grid.replaceChildren(h('div', { class: 'empty' }, 'لا توجد نتائج')); }
    async function searchServer(q) { try {
        const [r, b] = await Promise.all([api(`/api/products?q=${encodeURIComponent(q)}&limit=60`), api(`/api/inventory/balances?branchId=${encodeURIComponent(state.branch?.id ?? '')}`).catch(() => ({ items: [] }))]);
        const bm = new Map((b.items ?? []).map((x) => [x.productId, x]));
        products = r.items.map((p) => ({ ...p, stock: Number(bm.get(p.id)?.quantity ?? 0), nearestExpiry: bm.get(p.id)?.nearestExpiry ?? null }));
        renderProducts();
        return products;
    }
    catch {
        return [];
    } }
    function estimatedLoyaltyDiscount(amount) { if (!loyalty?.enabled)
        return 0; const requested = Math.max(0, Math.floor(Number(loyaltyPoints.value || 0))), maxBySale = Math.floor((amount * (loyalty.maxRedeemPercent / 100)) / loyalty.pointValue); return Math.min(requested, Math.floor(loyalty.points), Math.max(0, maxBySale)) * loyalty.pointValue; }
    function renderCart() { cartBox.replaceChildren(...cart.map((line, i) => h('div', { class: 'cart-row' }, h('div', {}, h('b', {}, line.product.name), h('small', {}, money(line.product.sellingPrice * line.quantity))), h('div', { class: 'qty-controls' }, h('button', { type: 'button', onClick: () => { line.quantity = Math.max(1, line.quantity - 1); renderCart(); } }, '−'), h('span', {}, String(line.quantity)), h('button', { type: 'button', onClick: () => { line.quantity++; renderCart(); } }, '+'), h('button', { type: 'button', onClick: () => { cart.splice(i, 1); renderCart(); } }, '×'))))); const subtotal = cart.reduce((s, l) => s + l.product.sellingPrice * l.quantity, 0), tax = cart.reduce((s, l) => s + l.product.sellingPrice * l.quantity * (l.product.taxRate / 100), 0), discount = Number(invoiceDiscount.value || 0), beforeLoyalty = Math.max(0, subtotal + tax - discount), loyaltyDiscount = estimatedLoyaltyDiscount(beforeLoyalty), total = Math.max(0, beforeLoyalty - loyaltyDiscount), needsRx = cart.some(l => l.product.requiresPrescription); rxField.style.display = needsRx ? 'grid' : 'none'; if (!needsRx)
        prescription.value = ''; totals.replaceChildren(row('قبل الضريبة', money(subtotal)), row('الضريبة', money(tax)), row('خصم يدوي', money(discount)), ...(loyaltyDiscount > 0 ? [row('خصم نقاط تقريبي', money(loyaltyDiscount))] : []), h('div', { class: 'total-row grand' }, h('span', {}, 'الإجمالي التقريبي'), h('span', {}, money(total)))); if (loyalty) {
        const hint = loyalty.enabled ? `الرصيد: ${Math.floor(loyalty.points)} نقطة • قيمة النقطة ${money(loyalty.pointValue)} • حد أدنى ${loyalty.minRedeemPoints} • أقصى ${loyalty.maxRedeemPercent}%` : 'برنامج الولاء متوقف';
        loyaltyInfo.textContent = hint;
    } const hasCosts = cart.length > 0 && cart.every(l => typeof l.product.costPrice === 'number'); if (canProfit && posPrefs.showProfitInPos !== false && hasCosts) {
        const cost = cart.reduce((s, l) => s + Number(l.product.costPrice) * l.quantity, 0), margin = Math.max(0, subtotal - discount - loyaltyDiscount - cost);
        profitHint.style.display = 'block';
        profitHint.textContent = `هامش تقريبي: ${money(margin)} — المرجع النهائي هو الفاتورة المعتمدة.`;
    }
    else
        profitHint.style.display = 'none'; }
    async function loadCredit() { creditInfo.textContent = ''; creditField.style.display = canCreditOverride && payment.value === 'credit' ? 'grid' : 'none'; if (!customer.value || payment.value !== 'credit' || !canSettlementRead)
        return; try {
        const r = await api(`/api/party360/customers/${encodeURIComponent(customer.value)}`);
        creditInfo.textContent = `المستحق ${money(Number(r.outstanding ?? 0))} • المتاح ${money(Number(r.availableCredit ?? 0))}`;
    }
    catch { } }
    async function loadLoyalty() { loyalty = null; loyaltyPoints.value = '0'; if (!customer.value || !canLoyaltyRead) {
        loyaltyInfo.textContent = 'اختر عميلاً لعرض نقاط الولاء';
        renderCart();
        return;
    } try {
        const r = await api(`/api/loyalty/${encodeURIComponent(customer.value)}?limit=10`);
        loyalty = { points: Number(r.account.points ?? 0), pointValue: Number(r.rule.pointValue ?? 0.01), minRedeemPoints: Number(r.rule.minRedeemPoints ?? 100), maxRedeemPercent: Number(r.rule.maxRedeemPercent ?? 20), enabled: r.rule.enabled !== false };
        loyaltyPoints.max = String(Math.max(0, Math.floor(loyalty.points)));
    }
    catch {
        loyaltyInfo.textContent = 'تعذر تحميل رصيد الولاء';
    } renderCart(); }
    search.oninput = () => { clearTimeout(searchTimer); searchTimer = window.setTimeout(() => void searchServer(search.value.trim()), 180); };
    search.onkeydown = async (e) => { if (e.key !== 'Enter')
        return; e.preventDefault(); const q = search.value.trim(); if (!q)
        return; const list = await searchServer(q), exact = list.find(p => p.barcode === q); if (exact) {
        add(exact);
        search.value = '';
        products = (await api('/api/products?limit=100')).items;
        renderProducts();
    } };
    invoiceDiscount.oninput = renderCart;
    loyaltyPoints.oninput = renderCart;
    customer.onchange = () => { if (customer.value) {
        const rx = prescriptions.find(x => x.customerId === customer.value);
        if (rx)
            prescription.value = rx.id;
    } void loadLoyalty(); void loadCredit(); };
    payment.onchange = () => void loadCredit();
    suspendBtn.onclick = async () => { if (!cart.length)
        return toast('لا توجد فاتورة لتعليقها', true); try {
        const labelText = prompt('اسم مختصر للفاتورة المعلقة (اختياري)') ?? '';
        const d = await post('/api/sales-drafts', { branchId: state.branch?.id, label: labelText, customerId: customer.value || null, payment: payment.value, invoiceDiscount: Number(invoiceDiscount.value || 0), loyaltyPointsToRedeem: Number(loyaltyPoints.value || 0), lines: cart.map(x => ({ productId: x.product.id, quantity: x.quantity })) });
        cart.splice(0);
        customer.value = '';
        payment.value = 'cash';
        invoiceDiscount.value = '0';
        loyaltyPoints.value = '0';
        creditOverride.value = '';
        renderCart();
        toast(`تم تعليق: ${d.label}`);
    }
    catch (e) {
        toast(e.message, true);
    } };
    draftsBtn.onclick = async () => { try {
        const d = await api(`/api/sales-drafts?branchId=${encodeURIComponent(state.branch?.id ?? '')}`);
        if (!d.items?.length)
            return toast('لا توجد فواتير معلقة');
        const select = h('select', { name: 'draftId' });
        for (const x of d.items)
            select.append(h('option', { value: x.id }, `${x.label} — ${x.lines.length} صنف — ${new Date(x.updatedAt).toLocaleString('ar-EG')}`));
        const body = h('div', { class: 'form-grid' }, label('اختر الفاتورة', select));
        modal('استرجاع فاتورة معلقة', body, async () => { const draft = await api(`/api/sales-drafts/${encodeURIComponent(select.value)}`); const restored = []; for (const l of draft.lines) {
            const p = await api(`/api/products/${encodeURIComponent(l.productId)}`);
            restored.push({ product: p, quantity: Number(l.quantity) });
        } cart.splice(0, cart.length, ...restored); customer.value = draft.customerId ?? ''; payment.value = draft.payment; invoiceDiscount.value = String(draft.invoiceDiscount ?? 0); loyaltyPoints.value = String(draft.loyaltyPointsToRedeem ?? 0); await fetch(`/api/sales-drafts/${encodeURIComponent(draft.id)}`, { method: 'DELETE', credentials: 'same-origin', headers: { 'content-type': 'application/json' } }); await loadLoyalty(); await loadCredit(); renderCart(); toast('تم استرجاع الفاتورة المعلقة'); });
    }
    catch (e) {
        toast(e.message, true);
    } };
    submit.onclick = async () => { if (!cart.length)
        return toast('أضف صنفاً واحداً على الأقل', true); if (posPrefs.confirmBeforeSale === true && !confirm('تأكيد اعتماد الفاتورة الحالية؟'))
        return; if (cart.some(x => x.product.requiresPrescription) && !prescription.value)
        return toast('الفاتورة تحتوي صنفاً يتطلب روشتة', true); const requestedPoints = Math.max(0, Math.floor(Number(loyaltyPoints.value || 0))); if (requestedPoints > 0 && !customer.value)
        return toast('استبدال النقاط يتطلب اختيار عميل', true); try {
        const payload = { branchId: state.branch?.id, customerId: customer.value || null, payment: payment.value, prescriptionId: prescription.value || null, invoiceDiscount: Number(invoiceDiscount.value || 0), loyaltyPointsToRedeem: requestedPoints, creditOverrideReason: creditOverride.value.trim() || undefined, lines: cart.map(x => ({ productId: x.product.id, quantity: x.quantity })) }, fingerprint = JSON.stringify(payload);
        if (fingerprint !== lastAttemptFingerprint) {
            lastAttemptFingerprint = fingerprint;
            lastAttemptKey = crypto.randomUUID();
        }
        submit.disabled = true;
        const sale = await post('/api/sales', { ...payload, idempotencyKey: lastAttemptKey });
        toast(`تم اعتماد ${sale.number}${sale.loyaltyPointsEarned ? ` — اكتسب ${sale.loyaltyPointsEarned} نقطة` : ''}${sale.profit != null ? ` — الربح ${money(sale.profit)}` : ''}`);
        lastAttemptFingerprint = '';
        lastAttemptKey = '';
        cart.splice(0);
        invoiceDiscount.value = '0';
        prescription.value = '';
        loyaltyPoints.value = '0';
        creditOverride.value = '';
        await loadLoyalty();
        await loadCredit();
        renderCart();
    }
    catch (e) {
        toast(e.message ?? 'تعذر اعتماد البيع', true);
    }
    finally {
        submit.disabled = false;
    } };
    if (posPrefs.autoFocusPosSearch !== false)
        window.setTimeout(() => search.focus(), 0);
    const keyHandler = (e) => { if (e.key === 'F2') {
        e.preventDefault();
        search.focus();
        search.select();
    }
    else if (e.key === 'F4') {
        e.preventDefault();
        suspendBtn.click();
    }
    else if (e.key === 'F9') {
        e.preventDefault();
        submit.click();
    }
    else if (e.key === 'Escape' && cart.length) {
        e.preventDefault();
        if (confirm('مسح الفاتورة الحالية؟')) {
            cart.splice(0);
            renderCart();
            search.focus();
        }
    } };
    document.addEventListener('keydown', keyHandler, { once: false });
    renderProducts();
    renderCart();
    return root;
}
function label(text, control) { return h('label', { class: 'field' }, h('span', {}, text), control); }
function row(a, b) { return h('div', { class: 'total-row' }, h('span', {}, a), h('span', {}, b)); }
function chip(labelText, value) { return h('div', { class: 'smart-pos-chip' }, h('small', {}, labelText), h('strong', {}, value)); }
