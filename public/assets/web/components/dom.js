const PROPERTY_ONLY = new Set(['value', 'checked', 'selected', 'disabled', 'multiple', 'muted', 'currentTime', 'volume', 'open']);
function attrName(k) { return k === 'htmlFor' ? 'for' : k === 'tabIndex' ? 'tabindex' : k; }
export function h(tag, attrs = {}, ...children) { const el = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false)
        continue;
    if (k === 'class')
        el.className = String(v);
    else if (k === 'html')
        el.innerHTML = String(v);
    else if (k.startsWith('on') && typeof v === 'function')
        el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'style' && typeof v === 'string')
        el.setAttribute('style', v);
    else if (PROPERTY_ONLY.has(k)) {
        try {
            el[k] = v;
        }
        catch {
            el.setAttribute(attrName(k), String(v));
        }
    }
    else if (v === true)
        el.setAttribute(attrName(k), '');
    else
        el.setAttribute(attrName(k), String(v));
} for (const c of children) {
    if (c == null)
        continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
} return el; }
export function money(v, c = 'EGP') { return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: c, maximumFractionDigits: 2 }).format(v || 0); }
export function toast(message, error = false) { document.querySelector('.toast')?.remove(); const el = h('div', { class: `toast${error ? ' error' : ''}`, role: error ? 'alert' : 'status', 'aria-live': error ? 'assertive' : 'polite' }, message); document.body.append(el); setTimeout(() => el.remove(), 3500); }
export function modal(title, body, onSubmit) { const form = h('form'); form.append(body); const backdrop = h('div', { class: 'modal-backdrop', role: 'presentation', onClick: (e) => { if (e.target === backdrop)
        backdrop.remove(); } }, h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, h('div', { class: 'modal-head' }, h('h3', {}, title), h('button', { class: 'icon-close', type: 'button', 'aria-label': 'إغلاق', onClick: () => backdrop.remove() }, '×')), h('div', { class: 'modal-body' }, form), h('div', { class: 'modal-foot' }, h('button', { class: 'btn primary', type: 'button' }, 'حفظ'), h('button', { class: 'btn', type: 'button', onClick: () => backdrop.remove() }, 'إلغاء')))); const save = backdrop.querySelector('.modal-foot .primary'); save.onclick = async () => { if (save.disabled)
    return; try {
    save.disabled = true;
    if (onSubmit)
        await onSubmit(form);
    backdrop.remove();
}
catch (e) {
    toast(e.message ?? 'تعذر الحفظ', true);
}
finally {
    save.disabled = false;
} }; document.body.append(backdrop); return backdrop; }
