import { api, post } from '../api/client.js';
import { h, toast } from '../components/dom.js';
export async function notificationsPage() {
    const root = h('div');
    const box = h('section', { class: 'card' });
    const refresh = h('button', { class: 'btn primary', type: 'button' }, 'تحديث التنبيهات');
    root.append(h('div', { class: 'section-head' }, h('div', {}, h('h2', {}, 'مركز التنبيهات'), h('p', {}, 'نفاد وانخفاض المخزون والصلاحية — تنبيهات قابلة للتنفيذ بدون تكرار عشوائي')), refresh), box);
    async function load(doRefresh = false) {
        if (doRefresh)
            await post('/api/alerts/refresh', {});
        const d = await api('/api/notifications');
        const list = h('div', { class: 'list' });
        for (const n of d.items ?? []) {
            const read = !!n.readAt;
            const btn = h('button', { class: 'btn sm', type: 'button', disabled: read }, read ? 'تمت القراءة' : 'تحديد كمقروء');
            if (!read) {
                btn.onclick = async () => {
                    await post(`/api/notifications/${encodeURIComponent(n.id)}/read`, {});
                    await load(false);
                };
            }
            const actions = h('div', { class: 'section-actions' });
            if (n.link) {
                actions.append(h('button', {
                    class: 'btn sm',
                    type: 'button',
                    onClick: () => window.dispatchEvent(new CustomEvent('elhafez:navigate', { detail: n.link })),
                }, 'فتح القسم'));
            }
            actions.append(btn);
            list.append(h('div', { class: `alert-row ${n.severity || 'info'} ${read ? 'read' : ''}` }, h('div', {}, h('strong', {}, n.title), h('p', {}, n.body), h('small', { class: 'muted' }, new Date(n.createdAt).toLocaleString('ar-EG'))), actions));
        }
        box.replaceChildren((d.items ?? []).length ? list : h('div', { class: 'empty' }, 'لا توجد تنبيهات تشغيلية حالية.'));
    }
    refresh.onclick = async () => {
        try {
            await load(true);
            toast('تم تحديث التنبيهات');
        }
        catch (e) {
            toast(e.message ?? 'تعذر تحديث التنبيهات', true);
        }
    };
    await load(true);
    return root;
}
