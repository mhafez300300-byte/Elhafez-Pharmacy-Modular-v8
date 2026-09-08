import { h, toast } from '../components/dom.js';
export async function backupPage() {
    const file = h('input', { type: 'file', accept: '.ehpbackup,application/json' });
    const confirm = h('input', { placeholder: 'اكتب RESTORE ELHAFEZ PHARMACY للتأكيد' });
    const restore = h('button', { class: 'btn danger', type: 'button', disabled: true }, 'استعادة النسخة');
    const verify = h('button', { class: 'btn', type: 'button' }, 'فحص النسخة أولًا');
    const download = h('button', { class: 'btn primary', type: 'button' }, 'تنزيل نسخة احتياطية مشفرة');
    const preview = h('div', { class: 'backup-preview muted' }, 'لم يتم فحص ملف بعد.');
    let verifiedBackup = null;
    download.onclick = async () => {
        try {
            const r = await fetch('/api/backup/export', { credentials: 'same-origin' });
            if (!r.ok) {
                const e = await r.json().catch(() => ({}));
                throw new Error(e.message ?? 'تعذر إنشاء النسخة');
            }
            const blob = await r.blob();
            const cd = r.headers.get('content-disposition') ?? '';
            const name = /filename="([^"]+)"/.exec(cd)?.[1] ?? `Elhafez-Pharmacy-${Date.now()}.ehpbackup`;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = name;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            toast('تم تجهيز النسخة الاحتياطية');
        }
        catch (e) {
            toast(e.message, true);
        }
    };
    file.onchange = () => {
        verifiedBackup = null;
        restore.disabled = true;
        preview.textContent = 'تم اختيار ملف جديد. اضغط فحص النسخة قبل الاستعادة.';
    };
    verify.onclick = async () => {
        try {
            const f = (file.files ?? [])[0];
            if (!f)
                return toast('اختر ملف النسخة الاحتياطية', true);
            const backup = JSON.parse(await f.text());
            const r = await fetch('/api/backup/verify', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ backup }),
            });
            const b = await r.json().catch(() => ({}));
            if (!r.ok)
                throw new Error(b.message ?? 'تعذر فحص النسخة');
            verifiedBackup = backup;
            restore.disabled = !(b.compatible && b.tenantMatch && b.requiredTablesPresent);
            preview.replaceChildren(h('strong', {}, restore.disabled ? 'النسخة غير صالحة للاستعادة هنا' : 'النسخة صالحة مبدئيًا'), h('div', {}, `تاريخ النسخة: ${b.createdAt} • الإصدار: ${b.appVersion}`), h('div', {}, `${b.tables} جدول • ${b.rows} سجل`), ...(b.warnings ?? []).map((x) => h('div', { class: 'tag warning' }, x)));
        }
        catch (e) {
            verifiedBackup = null;
            restore.disabled = true;
            preview.textContent = e.message ?? 'تعذر فحص النسخة';
            toast(e.message ?? 'تعذر فحص النسخة', true);
        }
    };
    restore.onclick = async () => {
        try {
            if (!verifiedBackup)
                return toast('يجب فحص النسخة أولًا', true);
            if (confirm.value !== 'RESTORE ELHAFEZ PHARMACY')
                return toast('اكتب عبارة التأكيد كاملة', true);
            const r = await fetch('/api/backup/restore', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ backup: verifiedBackup, confirmation: confirm.value }),
            });
            const b = await r.json().catch(() => ({}));
            if (!r.ok)
                throw new Error(b.message ?? 'تعذر الاستعادة');
            toast(`تمت الاستعادة (${b.tables} جدول)`);
            setTimeout(() => location.reload(), 800);
        }
        catch (e) {
            toast(e.message ?? 'تعذر الاستعادة', true);
        }
    };
    return h('div', {}, h('div', { class: 'section-head' }, h('div', {}, h('h2', {}, 'النسخ الاحتياطي والاستعادة'), h('p', {}, 'نسخة مشفرة + فحص Recovery Drill قبل أي استعادة'))), h('div', { class: 'grid two' }, h('section', { class: 'card' }, h('h3', {}, 'إنشاء نسخة'), h('p', { class: 'muted' }, 'يتم تشفير الملف قبل تنزيله. احتفظ بـ BACKUP_SECRET ثابتاً لاستعادته لاحقاً.'), download), h('section', { class: 'card danger-zone' }, h('h3', {}, 'استعادة كاملة'), h('p', { class: 'muted' }, 'لا يمكن تفعيل زر الاستعادة قبل فحص الملف والتأكد أنه يخص نفس الشركة وأن الجداول الأساسية مكتملة.'), h('div', { class: 'form-grid' }, lab('ملف النسخة', file), lab('عبارة التأكيد', confirm)), h('div', { class: 'section-actions', style: 'margin-top:12px' }, verify, restore), preview)));
}
function lab(t, e) { return h('label', { class: 'field' }, h('span', {}, t), e); }
