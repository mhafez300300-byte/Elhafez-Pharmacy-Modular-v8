import { api, post } from '../api/client.js';
import { h, toast } from '../components/dom.js';
import { state } from '../state/store.js';
export async function attendancePage() {
    const root = h('div');
    const header = h('div', { class: 'section-head' }, h('div', {}, h('h2', {}, 'الحضور والانصراف'), h('p', {}, 'تسجيل حضورك وانصرافك ومراجعة السجل بدون التأثير على الوردية النقدية')));
    const status = h('section', { class: 'card' });
    const history = h('section', { class: 'card section-gap' });
    root.append(header, status, history);
    async function load() {
        const mine = await api('/api/attendance/me');
        const open = mine.session;
        status.replaceChildren(h('div', { class: 'card-title' }, h('h3', {}, 'حالتك الحالية')), h('div', { class: 'list' }, h('div', { class: 'list-row' }, h('span', {}, 'الحالة'), h('strong', {}, open ? 'حاضر الآن' : 'غير مسجل حضور')), h('div', { class: 'list-row' }, h('span', {}, 'وقت الحضور'), h('strong', {}, open ? formatDate(open.checkIn) : '—'))), open
            ? h('button', { class: 'btn danger section-gap-sm', onClick: async () => { await post('/api/attendance/check-out', {}); toast('تم تسجيل الانصراف'); await load(); } }, 'تسجيل الانصراف')
            : h('button', { class: 'btn primary section-gap-sm', onClick: async () => { await post('/api/attendance/check-in', { branchId: state.branch?.id }); toast('تم تسجيل الحضور'); await load(); } }, 'تسجيل الحضور'));
        history.replaceChildren(h('div', { class: 'card-title' }, h('h3', {}, 'آخر الحركات')), mine.history.length ? attendanceTable(mine.history) : h('div', { class: 'empty' }, 'لا توجد حركات حضور بعد.'));
    }
    await load();
    return root;
}
function attendanceTable(items) {
    const table = h('div', { class: 'table-wrap' }, h('table', { class: 'table' }, h('thead', {}, h('tr', {}, ...['الحضور', 'الانصراف', 'المدة', 'ملاحظة'].map(x => h('th', {}, x)))), h('tbody')));
    const body = table.querySelector('tbody');
    for (const item of items) {
        body.append(h('tr', {}, h('td', {}, formatDate(item.checkIn)), h('td', {}, item.checkOut ? formatDate(item.checkOut) : 'مفتوح'), h('td', {}, duration(item.checkIn, item.checkOut)), h('td', {}, item.note ?? '—')));
    }
    return table;
}
function formatDate(value) { return new Date(value).toLocaleString('ar-EG'); }
function duration(start, end) {
    if (!end)
        return 'مستمر';
    const minutes = Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
    return `${Math.floor(minutes / 60)} س ${minutes % 60} د`;
}
