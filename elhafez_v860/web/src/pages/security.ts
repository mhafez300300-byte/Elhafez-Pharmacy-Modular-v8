import { api, post } from '../api/client.js';
import { h, toast } from '../components/dom.js';

export async function securityPage() {
  const root = h('div');
  const sessionsBox = h('section', { class: 'card' });
  const pinBox = h('section', { class: 'card' });

  root.append(
    h('div', { class: 'section-head' },
      h('div', {},
        h('h2', {}, 'الأمان والجلسات'),
        h('p', {}, 'إدارة الأجهزة النشطة وتغيير PIN بدون ترك جلسات قديمة صالحة'),
      ),
    ),
    h('div', { class: 'grid two' }, sessionsBox, pinBox),
  );

  async function load() {
    const d = await api<any>('/api/auth/sessions');
    const rows = h('div', { class: 'list' });
    for (const s of d.items ?? []) {
      const current = s.id === d.currentSessionId;
      const active = !s.revokedAt && new Date(s.expiresAt) > new Date();
      const btn = h('button', {
        class: 'btn sm danger',
        type: 'button',
        disabled: current || !active,
      }, current ? 'الجلسة الحالية' : active ? 'إنهاء' : 'منتهية') as HTMLButtonElement;
      if (!current && active) {
        btn.onclick = async () => {
          await post(`/api/auth/sessions/${encodeURIComponent(s.id)}/revoke`, {});
          toast('تم إنهاء الجلسة');
          await load();
        };
      }
      rows.append(
        h('div', { class: 'list-row' },
          h('div', {},
            h('strong', {}, current ? 'الجلسة الحالية' : (s.clientLabel || 'جهاز/متصفح')),
            h('small', { class: 'muted' }, `آخر نشاط: ${fmt(s.lastSeenAt)} • تنتهي: ${fmt(s.expiresAt)}`),
          ),
          h('div', {},
            h('span', { class: `tag ${active ? 'success' : ''}` }, active ? 'نشطة' : 'منتهية'),
            btn,
          ),
        ),
      );
    }
    const revoke = h('button', { class: 'btn danger', type: 'button' }, 'إنهاء كل الجلسات الأخرى') as HTMLButtonElement;
    revoke.onclick = async () => {
      const r = await post<any>('/api/auth/sessions/revoke-others', {});
      toast(`تم إنهاء ${r.revoked ?? 0} جلسة`);
      await load();
    };
    sessionsBox.replaceChildren(
      h('h3', {}, 'الجلسات النشطة'),
      h('p', { class: 'muted' }, 'أي جلسة يتم إنهاؤها تصبح غير صالحة فورًا حتى لو كان Cookie ما زال موجودًا على الجهاز.'),
      rows,
      revoke,
    );
  }

  const current = h('input', { type: 'password', inputmode: 'numeric', autocomplete: 'current-password', required: true, maxLength: 8 }) as HTMLInputElement;
  const next = h('input', { type: 'password', inputmode: 'numeric', autocomplete: 'new-password', required: true, minLength: 4, maxLength: 8 }) as HTMLInputElement;
  const again = h('input', { type: 'password', inputmode: 'numeric', autocomplete: 'new-password', required: true, minLength: 4, maxLength: 8 }) as HTMLInputElement;
  const form = h('form', { class: 'form-grid' },
    lab('PIN الحالي', current),
    lab('PIN الجديد', next),
    lab('تأكيد PIN الجديد', again),
    h('div', { class: 'span-2' }, h('button', { class: 'btn primary', type: 'submit' }, 'تغيير PIN وإنهاء كل الجلسات')),
  ) as HTMLFormElement;
  form.onsubmit = async e => {
    e.preventDefault();
    if (next.value !== again.value) return toast('تأكيد PIN غير مطابق', true);
    if (!/^\d{4,8}$/.test(next.value)) return toast('PIN يجب أن يكون من 4 إلى 8 أرقام', true);
    try {
      await post('/api/auth/pin', { currentPin: current.value, newPin: next.value });
      toast('تم تغيير PIN. سيتم تسجيل الدخول من جديد.');
      setTimeout(() => location.reload(), 700);
    } catch (err: any) {
      toast(err.message ?? 'تعذر تغيير PIN', true);
    }
  };
  pinBox.replaceChildren(
    h('h3', {}, 'تغيير PIN'),
    h('p', { class: 'muted' }, 'لأسباب أمنية، تغيير PIN ينهي جميع الجلسات بما فيها الحالية.'),
    form,
  );

  await load();
  return root;
}

function lab(t: string, e: HTMLElement) { return h('label', { class: 'field' }, h('span', {}, t), e); }
function fmt(x: string) { try { return new Date(x).toLocaleString('ar-EG'); } catch { return x; } }
