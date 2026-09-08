import { api, post } from '../api/client.js';
import { h, money, modal, toast } from '../components/dom.js';

export async function salesPage() {
  const root = h('div');
  const head = h('div', { class: 'section-head' },
    h('div', {},
      h('h2', {}, 'المبيعات والمرتجعات'),
      h('p', {}, 'فواتير البيع وحالة المرتجعات')
    )
  );
  const box = h('section', { class: 'card' });
  root.append(head, box);

  async function load() {
    const [sales, products, customers] = await Promise.all([
      api<any>('/api/sales?limit=200'),
      api<any>('/api/products?limit=500'),
      api<any>('/api/customers')
    ]);
    const productNames = new Map(products.items.map((x:any) => [x.id, x.name]));
    const customerNames = new Map(customers.items.map((x:any) => [x.id, x.name]));
    box.replaceChildren(
      sales.items?.length
        ? renderSales(sales.items, productNames, customerNames, load, sales.profitVisible === true)
        : h('div', { class: 'empty' }, 'لا توجد مبيعات بعد.')
    );
  }

  await load();
  return root;
}

function renderSales(items:any[], products:Map<any,any>, customers:Map<any,any>, done:()=>Promise<void>, profitVisible:boolean) {
  const headers = ['الرقم','العميل','الدفع','الإجمالي', ...(profitVisible ? ['الربح'] : []), 'الحالة','التاريخ','المستند',''];
  const wrap = h('div', { class: 'table-wrap' },
    h('table', { class: 'table' },
      h('thead', {}, h('tr', {}, ...headers.map(x => h('th', {}, x)))),
      h('tbody')
    )
  );
  const tbody = wrap.querySelector('tbody')!;
  for (const sale of items) {
    const canReturn = sale.status !== 'returned';
    const btn = canReturn
      ? h('button', { class: 'btn sm', onClick: () => openReturn(sale, products, done) }, 'مرتجع')
      : h('span', { class: 'muted' }, '—');
    tbody.append(
      h('tr', {},
        h('td', {}, sale.number),
        h('td', {}, sale.customerId ? (customers.get(sale.customerId) ?? sale.customerId) : 'نقدي'),
        h('td', {}, sale.payment),
        h('td', {}, money(sale.total)),
        ...(profitVisible ? [h('td', {}, money(sale.profit))] : []),
        h('td', {}, sale.status === 'posted' ? 'معتمدة' : sale.status === 'returned' ? 'مرتجعة بالكامل' : 'مرتجع جزئي'),
        h('td', {}, new Date(sale.createdAt).toLocaleString('ar-EG')),
        h('td', {}, h('div',{class:'section-actions'},h('button',{class:'btn sm',onClick:()=>window.open(`/api/documents/sales/${sale.id}/print`,'_blank')},'طباعة'),h('button',{class:'btn sm',onClick:()=>download(`/api/documents/sales/${sale.id}/pdf`)},'PDF'),h('button',{class:'btn sm',onClick:()=>void sharePdf(`/api/documents/sales/${sale.id}/pdf`,`فاتورة بيع - ${sale.number}.pdf`)},'مشاركة PDF'),h('button',{class:'btn sm',onClick:()=>download(`/api/documents/sales/${sale.id}/excel`)},'Excel'))),
        h('td', {}, btn)
      )
    );
  }
  return wrap;
}

function openReturn(sale:any, products:Map<any,any>, done:()=>Promise<void>) {
  if (!sale.lines?.length) return toast('الفاتورة لا تحتوي أسطر قابلة للمرتجع', true);
  const line = select('saleLineId', sale.lines.map((x:any) => [x.id, `${products.get(x.productId) ?? x.productId} — مباع ${x.quantity}`]));
  const quantity = input('quantity', 'number', '1');
  const classification = select('classification', [
    ['sellable','صالح للبيع'],
    ['quarantine','حجر / مراجعة'],
    ['damaged','تالف'],
    ['expired','منتهي']
  ]);
  const reason = input('reason', 'text', '');
  const body = h('div', { class: 'form-grid' },
    field('الصنف', line),
    field('الكمية', quantity),
    field('تصنيف المرتجع', classification),
    field('السبب', reason)
  );
  modal(`مرتجع ${sale.number}`, body, async form => {
    const d = new FormData(form);
    const out = await post<any>(`/api/sales/${sale.id}/returns`, {
      reason: d.get('reason'),
      lines: [{
        saleLineId: d.get('saleLineId'),
        quantity: Number(d.get('quantity')),
        classification: d.get('classification')
      }]
    });
    toast(`تم اعتماد المرتجع بقيمة ${money(out.total)}`);
    await done();
  });
}

function field(text:string, control:HTMLElement) {
  return h('label', { class: 'field' }, h('span', {}, text), control);
}
function input(name:string, type='text', value='') {
  return h('input', {
    name, type, value,
    required: name === 'quantity',
    min: type === 'number' ? '0.01' : undefined,
    step: type === 'number' ? '0.01' : undefined
  });
}
function select(name:string, options:any[]) {
  const s = h('select', { name });
  for (const [value,label] of options) s.append(h('option', { value }, label));
  return s;
}

function download(url:string){const a=document.createElement('a');a.href=url;a.download='';document.body.append(a);a.click();a.remove();}

async function sharePdf(url:string,filename:string){const r=await fetch(url,{credentials:'same-origin'});if(!r.ok)throw new Error('تعذر إنشاء PDF');const blob=await r.blob(),file=new File([blob],filename,{type:'application/pdf'}),nav=navigator as Navigator&{canShare?:(d:any)=>boolean;share?:(d:any)=>Promise<void>};if(nav.share&&(!nav.canShare||nav.canShare({files:[file]}))){await nav.share({files:[file],title:filename});return;}const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);}
