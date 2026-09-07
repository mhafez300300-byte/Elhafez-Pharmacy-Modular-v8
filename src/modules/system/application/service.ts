import type { SystemServiceDependencies } from '../contracts/dependencies';
'use strict';
module.exports=function create_system_service(ctx:SystemServiceDependencies){
 const {
  fs
 }=ctx;



function htmlEsc(v:any=''){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

function chromiumBin(){for(const x of [process.env.CHROMIUM_BIN,'/usr/bin/chromium-browser','/usr/bin/chromium','/usr/bin/google-chrome'])if(x&&fs.existsSync(x))return x;return''}

function salePdfHtml(sale:any,settings:any={},provider:any={}){
 const lines=Array.isArray(sale.lines)?sale.lines:[], business=settings.receiptBusinessName||settings.pharmacyName||'الصيدلية', phone=settings.receiptPhone??settings.phone??'', address=settings.receiptAddress??settings.address??'', tax=settings.receiptTaxNumber??settings.taxNumber??'', cr=settings.receiptCommercialRegister??settings.commercialRegister??'', logo=String(settings.receiptLogoData||'');
 const rows=lines.map(x=>`<tr><td>${htmlEsc(x.name||x.productName||'صنف')}</td><td>${htmlEsc(x.unitLabel||'')}</td><td>${Number(x.qty??x.packs??1)}</td><td>${Number(x.unitPrice??x.price??0).toFixed(2)}</td><td>${Number(x.total??((x.qty??x.packs??1)*(x.unitPrice??x.price??0))).toFixed(2)}</td></tr>`).join('');
 const powered=provider?.enabled===false?'':`<div class=provider>Powered by ${htmlEsc(provider?.name||'Elhafez Technology')}${provider?.phone?` • ${htmlEsc(provider.phone)}`:''}</div>`;
 return `<!doctype html><html lang=ar dir=rtl><head><meta charset=utf-8><style>@page{size:A4;margin:10mm 12mm}*{box-sizing:border-box}html,body{margin:0;background:#fff;color:#17343a}body{font-family:'Noto Sans Arabic','Arial','Tahoma',sans-serif;font-size:11px}.sheet{width:100%;min-height:0}.head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;border-bottom:2px solid #0a7180;padding-bottom:8px;margin-bottom:10px}.brand{display:flex;gap:10px;align-items:center}.logo{width:50px;height:50px;object-fit:contain;border-radius:9px}.fallback{width:50px;height:50px;border:1px solid #ccdadd;border-radius:9px;display:grid;place-items:center;font-size:22px;font-weight:800}.brand h1{font-size:18px;margin:0 0 3px}.muted{color:#71858a;font-size:9px}.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:8px 0}.meta div{border:1px solid #d9e5e7;border-radius:7px;padding:6px}.meta b{display:block;color:#526467;font-size:9px;margin-bottom:2px}table{width:100%;border-collapse:collapse;margin-top:8px;table-layout:fixed}th,td{border:1px solid #d9e5e7;padding:6px;text-align:right;vertical-align:top;overflow-wrap:anywhere}th{background:#edf7f8;color:#16444b}th:first-child{width:38%}.totals{margin-top:8px;margin-inline-start:auto;width:min(320px,100%);border:1px solid #d9e5e7;border-radius:8px;padding:7px}.totals div{display:flex;justify-content:space-between;padding:4px 0}.totals .grand{font-size:14px;font-weight:800;border-top:1px solid #cddadb;padding-top:6px}.footer{margin-top:10px;border-top:1px solid #d9e5e7;padding-top:7px;text-align:center;color:#71858a;font-size:8px;line-height:1.45}.provider{margin-top:4px;font-size:7px;color:#8b989b}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><div class=sheet><div class=head><div class=brand>${logo?`<img class=logo src="${htmlEsc(logo)}">`:`<div class=fallback>${htmlEsc(String(business).trim().charAt(0)||'ص')}</div>`}<div><h1>${htmlEsc(business)}</h1><div class=muted>${[phone,address].filter(Boolean).map(htmlEsc).join(' • ')}</div></div></div><div><b>فاتورة بيع</b><div class=muted>${htmlEsc(sale.no||'')}</div></div></div><div class=meta><div><b>التاريخ</b>${htmlEsc(new Date(sale.at||Date.now()).toLocaleString('ar-EG'))}</div><div><b>العميل</b>${htmlEsc(sale.customerName||'بيع نقدي')}</div><div><b>طريقة الدفع</b>${htmlEsc(sale.paymentLabel||sale.payment||'')}</div>${tax?`<div><b>الرقم الضريبي</b>${htmlEsc(tax)}</div>`:''}${cr?`<div><b>السجل التجاري</b>${htmlEsc(cr)}</div>`:''}</div><table><thead><tr><th>الصنف</th><th>الوحدة</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>${rows||'<tr><td colspan=5>لا توجد تفاصيل أصناف</td></tr>'}</tbody></table><div class=totals><div><span>الإجمالي قبل الخصم</span><b>${Number(sale.subtotal??sale.total??0).toFixed(2)}</b></div><div><span>الخصم</span><b>${Number(sale.discount||0).toFixed(2)}</b></div><div class=grand><span>الإجمالي</span><b>${Number(sale.total||0).toFixed(2)}</b></div></div><div class=footer>شكرًا لتعاملكم معنا${powered}</div></div></body></html>`
}

 return {htmlEsc,chromiumBin,salePdfHtml};
};

export {};
