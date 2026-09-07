(()=>{
'use strict';
const A=window.PharmaApp,R=window.PharmaRemote;if(!A)return;
const {$,$$,esc,num,money,pageHead,empty,badge,toast,modal,closeModal,id,all,get,put}=A;
const sameBranch=x=>{const b=A.state.settings?.branchId;return !b||!x?.branchId||x.branchId===b};
const dt=v=>v?new Date(v).toLocaleString('ar-EG-u-nu-latn'):'—';
const text=v=>String(v??'');
const safeName=s=>text(s||'export').replace(/[^\p{L}\p{N}._-]+/gu,'-').replace(/-+/g,'-').slice(0,80)||'export';

Object.assign(A.titles,{
 loyalty:['العروض والولاء','نقاط العملاء والمكافآت والحركة'],
 clinical_safety:['السلامة الدوائية','فحص التكرار والحساسية والتداخلات المسجلة']
});

/* ---------- Reliable page execution ---------- */
const critical=['settings','attendance','cash','offers','price_center'];
for(const key of critical){
 const original=A.pages[key];
 if(typeof original==='function'&&!original.__safeWrapped){
   const wrapped=async()=>{try{return await original()}catch(e){console.error('page',key,e);$('#content').innerHTML=`${pageHead(A.titles[key]?.[0]||key,'تعذر تحميل القسم')}<div class="notice danger"><b>تعذر فتح القسم.</b><br>${esc(e?.message||e)}<div class="section-gap-sm"><button class="btn info" data-retry-page="${key}">إعادة المحاولة</button></div></div>`;document.querySelector(`[data-retry-page="${key}"]`)?.addEventListener('click',()=>A.render())}};
   wrapped.__safeWrapped=true;A.pages[key]=wrapped;
 }
}

/* ---------- Loyalty page (was missing) ---------- */
A.register('loyalty',async()=>{
 const [customers,moves]=await Promise.all([all('customers'),all('loyalty')]);
 const rows=customers.slice().sort((a,b)=>num(b.points)-num(a.points));
 const total=rows.reduce((a,c)=>a+num(c.points),0),st=A.state.settings||{};
 $('#content').innerHTML=`${pageHead('العروض والولاء','إدارة نقاط العملاء بشكل واضح','<button id="loyExport" class="btn info">تصدير</button>')}
 <div class="grid three"><div class="card kpi"><small>إجمالي النقاط</small><strong>${total}</strong></div><div class="card kpi"><small>عملاء لديهم نقاط</small><strong>${rows.filter(x=>num(x.points)>0).length}</strong></div><div class="card kpi"><small>كل مبلغ لاكتساب نقطة</small><strong>${money(st.loyaltyEarnEvery||10)}</strong></div></div>
 <div class="card section-gap"><div class="toolbar"><input id="loyQ" class="search" placeholder="ابحث باسم العميل أو الهاتف"></div><div id="loyList" class="list">${rows.map(c=>`<div class="list-item" data-loy-row><div><b>${esc(c.name)}</b><small>${esc(c.phone||'')} • رصيد ${money(c.balance||0)}</small></div><div class="row-actions"><strong>${num(c.points)} نقطة</strong><button class="btn warn tiny" data-loy-adjust="${c.id}">تسوية</button></div></div>`).join('')||empty()}</div></div>
 <div class="card section-gap"><h3>آخر حركات الولاء</h3><div class="list">${moves.slice().sort((a,b)=>new Date(b.at)-new Date(a.at)).slice(0,30).map(m=>`<div class="list-item"><div><b>${esc(m.customerName||m.customerId||'عميل')}</b><small>${dt(m.at)} • ${esc(m.note||m.type||'تسوية')}</small></div><b>${num(m.points)>0?'+':''}${num(m.points)}</b></div>`).join('')||empty('لا توجد حركات')}</div></div>`;
 const q=$('#loyQ');q.oninput=()=>{const v=q.value.trim().toLowerCase();$$('[data-loy-row]').forEach(el=>el.classList.toggle('hidden',!el.textContent.toLowerCase().includes(v)))};
 $$('[data-loy-adjust]').forEach(b=>b.onclick=async()=>{const c=await get('customers',b.dataset.loyAdjust);modal('تسوية نقاط العميل',`<form id="loyForm" class="form-grid"><label>العميل<input value="${esc(c.name)}" disabled></label><label>النقاط الحالية<input value="${num(c.points)}" disabled></label><label>التغيير (+ أو -)<input name="delta" type="number" step="1" required></label><label>السبب<input name="note" required></label></form>`,`<button class="btn" data-close>إلغاء</button><button id="saveLoy" class="btn warn">اعتماد التسوية</button>`);$('#saveLoy').onclick=async()=>{const f=$('#loyForm');if(!f.reportValidity())return;const fd=new FormData(f),delta=Math.trunc(num(fd.get('delta')));c.points=Math.max(0,num(c.points)+delta);await put('customers',c);await put('loyalty',{id:id('loy'),customerId:c.id,customerName:c.name,points:delta,note:fd.get('note'),userId:A.state.user.id,userName:A.state.user.name,at:new Date().toISOString(),branchId:A.state.settings?.branchId});await A.audit('تسوية نقاط',`${c.name} • ${delta} • ${fd.get('note')}`);closeModal();toast('تم تحديث نقاط العميل');A.render()}});
 $('#loyExport').onclick=()=>exportStore('loyalty');
});

/* ---------- Clinical safety page (was missing) ---------- */
A.register('clinical_safety',async()=>{
 const products=(await all('products')).filter(p=>p.status!=='inactive').sort((a,b)=>text(a.name).localeCompare(text(b.name),'ar'));
 $('#content').innerHTML=`${pageHead('السلامة الدوائية','أداة مساعدة للصيدلي وليست بديلًا عن الحكم المهني')}
 <div class="grid two"><div class="card"><h3>اختيار الأدوية</h3><form id="clinicalForm" class="form-grid"><label>الأدوية<select id="clinicalProducts" name="productIds" multiple size="10">${products.map(p=>`<option value="${p.id}">${esc(p.name)} — ${esc(p.active||'')}</option>`).join('')}</select></label><label>حساسيات معروفة<textarea name="allergies" placeholder="مثال: penicillin, aspirin"></textarea></label></form><button id="runClinicalPage" class="btn primary wide">فحص الآن</button></div><div class="card"><h3>النتيجة</h3><div id="clinicalResult">${empty('اختر دواء أو أكثر ثم اضغط فحص')}</div></div></div>`;
 $('#runClinicalPage').onclick=async()=>{const ids=[...$('#clinicalProducts').selectedOptions].map(x=>x.value);if(!ids.length){toast('اختر دواء واحدًا على الأقل','warn');return}if(!R?.enabled){$('#clinicalResult').innerHTML='<div class="notice warn">الفحص المتقدم يحتاج اتصال نسخة الصيدلية بالخادم.</div>';return}try{const x=await R.clinicalCheck({productIds:ids,allergies:new FormData($('#clinicalForm')).get('allergies')||''});const alerts=x.alerts||[];$('#clinicalResult').innerHTML=alerts.length?`<div class="list">${alerts.map(a=>`<div class="list-item"><div><b>${esc(a.severity==='danger'?'تحذير مهم':'تنبيه')}</b><small>${esc(a.message)}</small><small>${esc(a.source||'')}</small></div>${badge(a.severity==='danger'?'خطر':'مراجعة',a.severity==='danger'?'danger':'warn')}</div>`).join('')}</div><div class="notice section-gap-sm">${esc(x.disclaimer||'')}</div>`:'<div class="notice success">لم يجد المحرك تنبيهات من القواعد المتاحة. راجع الحالة سريريًا كالمعتاد.</div>'}catch(e){toast(e.message,'danger')}};
});

/* ---------- Excel-compatible export and A4 PDF ---------- */
function scalar(v){if(v==null)return'';if(Array.isArray(v))return v.map(x=>typeof x==='object'?JSON.stringify(x):x).join(' | ');if(typeof v==='object')return JSON.stringify(v);return v}
function xmlEsc(v){return text(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function downloadBlob(name,blob){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},800)}
function toExcelXml(title,headers,rows){
 const cells=r=>r.map(v=>`<Cell><Data ss:Type="${typeof v==='number'&&Number.isFinite(v)?'Number':'String'}">${xmlEsc(scalar(v))}</Data></Cell>`).join('');
 return `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#DDEFF2" ss:Pattern="Solid"/></Style></Styles><Worksheet ss:Name="${xmlEsc(title).slice(0,28)}"><Table><Row ss:StyleID="Header">${cells(headers)}</Row>${rows.map(r=>`<Row>${cells(r)}</Row>`).join('')}</Table></Worksheet></Workbook>`;
}
function exportExcel(title,headers,rows){downloadBlob(`${safeName(title)}-${A.today()}.xls`,new Blob(['\ufeff',toExcelXml(title,headers,rows)],{type:'application/vnd.ms-excel;charset=utf-8'}))}
function parseDelimited(raw){
 const source=text(raw).replace(/^\ufeff/,''),first=source.split(/\r?\n/)[0]||'',delimiter=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?';':first.includes('\t')?'\t':',';let row=[],cell='',quoted=false;const matrix=[];
 for(let i=0;i<source.length;i++){const c=source[i];if(c==='"'){if(quoted&&source[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(c===delimiter&&!quoted){row.push(cell.trim());cell=''}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&source[i+1]==='\n')i++;row.push(cell.trim());cell='';if(row.some(Boolean))matrix.push(row);row=[]}else cell+=c}
 row.push(cell.trim());if(row.some(Boolean))matrix.push(row);if(matrix.length<2)return[];const headers=matrix.shift().map(x=>x.trim());return matrix.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??''])));
}
function parseExcelXml(raw){
 const doc=new DOMParser().parseFromString(text(raw).replace(/^\ufeff/,''),'application/xml');if(doc.querySelector('parsererror'))throw new Error('ملف Excel غير صالح');const matrix=[...doc.getElementsByTagNameNS('*','Row')].map(row=>[...row.getElementsByTagNameNS('*','Cell')].map(cell=>cell.getElementsByTagNameNS('*','Data')[0]?.textContent?.trim()||''));if(matrix.length<2)return[];const headers=matrix.shift();return matrix.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??''])));
}
function parseXlsx(buffer){
 if(!window.fflate?.unzipSync)throw new Error('قارئ Excel لم يكتمل تحميله؛ حدّث الصفحة وحاول مرة أخرى');const files=window.fflate.unzipSync(new Uint8Array(buffer)),decode=bytes=>new TextDecoder().decode(bytes),xml=path=>{if(!files[path])return null;const doc=new DOMParser().parseFromString(decode(files[path]),'application/xml');if(doc.querySelector('parsererror'))throw new Error('ملف Excel غير صالح');return doc},sharedDoc=xml('xl/sharedStrings.xml'),shared=sharedDoc?[...sharedDoc.getElementsByTagNameNS('*','si')].map(si=>[...si.getElementsByTagNameNS('*','t')].map(t=>t.textContent||'').join('')):[],sheetPath=Object.keys(files).filter(x=>/^xl\/worksheets\/sheet\d+\.xml$/i.test(x)).sort()[0];if(!sheetPath)throw new Error('لا توجد ورقة بيانات داخل ملف Excel');const sheet=xml(sheetPath),matrix=[];
 const colIndex=ref=>{const letters=(text(ref).match(/[A-Z]+/i)||['A'])[0].toUpperCase();let n=0;for(const c of letters)n=n*26+c.charCodeAt(0)-64;return n-1};for(const row of sheet.getElementsByTagNameNS('*','row')){const values=[];for(const cell of row.getElementsByTagNameNS('*','c')){const type=cell.getAttribute('t')||'',v=cell.getElementsByTagNameNS('*','v')[0]?.textContent??'',inline=cell.getElementsByTagNameNS('*','is')[0];values[colIndex(cell.getAttribute('r'))]=type==='s'?shared[Number(v)]??'':type==='inlineStr'?[...inline.getElementsByTagNameNS('*','t')].map(x=>x.textContent||'').join(''):v}if(values.some(x=>text(x).trim()!==''))matrix.push(values)}if(matrix.length<2)return[];const headers=matrix.shift().map(x=>text(x).trim());return matrix.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??''])));
}
async function readSpreadsheetFile(file){const name=text(file?.name).toLowerCase();if(name.endsWith('.xlsx'))return parseXlsx(await file.arrayBuffer());const raw=await file.text();return /^\s*(?:<\?xml|<Workbook)/i.test(raw.replace(/^\ufeff/,''))?parseExcelXml(raw):parseDelimited(raw)}
A.readSpreadsheetFile=readSpreadsheetFile;
function printHtml(title,body){
 const st=A.state.settings||{},doc=`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(title)}</title><style>@page{size:A4;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,Tahoma,sans-serif;color:#17343a;margin:0}header{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;border-bottom:3px solid #0a7180;padding-bottom:10px;margin-bottom:14px}.report-brand{display:flex;align-items:center;gap:10px}.report-logo{width:54px;height:54px;object-fit:contain;border-radius:10px}.report-logo-fallback{width:54px;height:54px;display:grid;place-items:center;border:1px solid #cbdadd;border-radius:10px;font-size:22px;font-weight:800}h1{font-size:20px;margin:0}small{color:#71858a}table{width:100%;border-collapse:collapse;font-size:10px}th{background:#edf7f8;color:#16444b}th,td{border:1px solid #d9e5e7;padding:6px;text-align:right;vertical-align:top}tr:nth-child(even){background:#fbfdfd}.meta{margin:5px 0 14px}.footer{margin-top:16px;border-top:1px solid #d9e5e7;padding-top:8px;font-size:9px;color:#71858a}.metric-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:10px 0}.metric{border:1px solid #d9e5e7;border-radius:8px;padding:8px}.metric b{display:block;font-size:15px}</style></head><body><header><div class="report-brand">${A.receiptLogoSrc?.(st.receiptLogoData)?`<img class="report-logo" src="${A.receiptLogoSrc(st.receiptLogoData)}" alt="">`:`<span class="report-logo-fallback">${A.receiptLogoFallback?.(st.receiptBusinessName||st.pharmacyName||'ص')||'ص'}</span>`}<div><h1>${esc(st.receiptBusinessName||st.pharmacyName||'الصيدلية')}</h1><small>${esc(st.branchName||'')}</small></div></div><div><b>${esc(title)}</b><div>${dt(new Date())}</div></div></header>${body}<div class="footer">تم إنشاء التقرير بواسطة Elhafez Pharmacy</div></body></html>`;
 if(window.AndroidBridge?.printHtml){try{window.AndroidBridge.printHtml(title,doc);return}catch{}}
 const w=window.open('','_blank');if(!w){toast('اسمح بفتح نافذة الطباعة','warn');return}w.document.write(doc);w.document.close();setTimeout(()=>{w.focus();w.print()},150)
}
const specs={
 products:{title:'الأصناف',store:'products',cols:[['الاسم','name'],['الباركود','barcode'],['GTIN','gtin'],['المادة الفعالة','active'],['التركيز','strength'],['الشكل الدوائي','form'],['الشركة','company'],['التصنيف','category'],['المكان','location'],['شراء','buyPrice'],['بيع','sellPrice'],['شرائط العلبة','packToStrip'],['وحدات الشريط','stripToUnit'],['حد أدنى','minStock'],['وصفة','rx']]},
 sales:{title:'المبيعات',store:'sales',cols:[['الفاتورة','no'],['التاريخ','at'],['العميل','customerName'],['الكاشير','userName'],['الدفع','paymentLabel'],['الإجمالي','total'],['الخصم','discount'],['الربح','grossProfit'],['الوردية','shiftId']]},
 inventory:{title:'المخزون',store:'batches',cols:[['الكود','id'],['الصنف','productName'],['التشغيلة','batchNo'],['الصلاحية','expiry'],['الكمية','qtyBase'],['التكلفة','costPerBase']]},
 purchases:{title:'المشتريات',store:'purchases',cols:[['الفاتورة','no'],['المورد','supplierName'],['التاريخ','at'],['الإجمالي','total'],['المتبقي','balance']]},
 suppliers:{title:'الموردون',store:'suppliers',cols:[['الاسم','name'],['الهاتف','phone'],['الرصيد','balance'],['أجل السداد','paymentTermsDays']]},
 customers:{title:'العملاء',store:'customers',cols:[['الاسم','name'],['الهاتف','phone'],['الرصيد','balance'],['النقاط','points']]},
 expenses:{title:'المصروفات',store:'expenses',cols:[['التاريخ','at'],['النوع','category'],['البيان','note'],['القيمة','amount'],['المستخدم','userName']]},
 attendance:{title:'الحضور والانصراف',store:'attendance',cols:[['الموظف','userName'],['حضور','clockIn'],['انصراف','clockOut']]},
 cash:{title:'الورديات',store:'shifts',cols:[['الموظف','userName'],['بداية','openedAt'],['نهاية','closedAt'],['افتتاحي','openingCash'],['متوقع','expectedCash'],['فعلي','actualCash'],['الفرق','difference'],['عدد الفواتير','salesCount']]},
 price_center:{title:'الأسعار',store:'products',cols:[['الصنف','name'],['الباركود','barcode'],['شراء','buyPrice'],['بيع','sellPrice']]},
 offers:{title:'العروض',store:'offers',cols:[['اسم العرض','name'],['النوع','type'],['القيمة','value'],['الحالة','active'],['بداية','startAt'],['نهاية','endAt']]},
 loyalty:{title:'الولاء',store:'customers',cols:[['العميل','name'],['الهاتف','phone'],['النقاط','points'],['الرصيد','balance']]},
 audit:{title:'سجل التدقيق',store:'audit',cols:[['التاريخ','at'],['المستخدم','user'],['العملية','action'],['التفاصيل','detail']]},
 expiry:{title:'الصلاحية والتشغيلات',store:'batches',cols:[['الصنف','productName'],['التشغيلة','batchNo'],['الصلاحية','expiry'],['الكمية','qtyBase'],['الحالة','status']]},
 recalls:{title:'سحب الأدوية',store:'recalls',cols:[['الصنف','productName'],['التشغيلة','batchNo'],['الحالة','status'],['التاريخ','at'],['السبب','reason']]},
 counts:{title:'الجرد',store:'counts',cols:[['رقم الجرد','no'],['التاريخ','at'],['الحالة','status'],['المستخدم','userName'],['ملاحظات','note']]},
 transfers:{title:'التحويلات',store:'transfers',cols:[['التحويل','no'],['التاريخ','at'],['من فرع','fromBranchName'],['إلى فرع','toBranchName'],['الحالة','status']]},
 purchase_orders:{title:'أوامر الشراء',store:'purchaseOrders',cols:[['الأمر','no'],['المورد','supplierName'],['تاريخ الإنشاء','createdAt'],['التوريد المتوقع','expectedDate'],['الحالة','status'],['القيمة المتوقعة','expectedTotal']]},
 supplier_returns:{title:'مرتجعات الموردين',store:'supplierReturns',cols:[['المرجع','no'],['المورد','supplierName'],['الصنف','productName'],['التشغيلة','batchNo'],['الكمية','packs'],['القيمة','value'],['التاريخ','at']]},
 orders:{title:'الطلبات والتوصيل',store:'orders',cols:[['الطلب','no'],['العميل','customerName'],['الهاتف','phone'],['العنوان','address'],['الحالة','status'],['القيمة','estimate'],['رسوم التوصيل','deliveryFee'],['التاريخ','createdAt']]},
 prescriptions:{title:'الروشتات',store:'prescriptions',cols:[['الرقم','no'],['العميل','customerName'],['الطبيب','doctorName'],['التاريخ','at'],['الحالة','status']]},
 doctors:{title:'الأطباء',store:'doctors',cols:[['الاسم','name'],['الهاتف','phone'],['التخصص','specialty'],['رقم الترخيص','licenseNo']]},
 contracts:{title:'التعاقدات',store:'contracts',cols:[['الاسم','name'],['الحالة','active'],['نسبة الخصم','discountPercent'],['بداية','startDate'],['نهاية','endDate']]},
 track_trace:{title:'التتبع الدوائي',store:'trackEvents',cols:[['التاريخ','at'],['النوع','eventType'],['الكود','code'],['GTIN','gtin'],['Serial','serial'],['Batch','batchNo'],['الحالة','status']]},
 shortage_notebook:{title:'كشكول النواقص',store:'shortageNotes',cols:[['الصنف','productName'],['الكمية المقترحة','qtyPacks'],['الحالة','status'],['السبب','reason'],['العميل','customerName'],['التاريخ','createdAt']]},
 push_list:{title:'قائمة أولوية البيع',store:'pushList',cols:[['الصنف','productName'],['الأولوية','priority'],['الهدف','targetPacks'],['الحالة','active'],['من','startDate'],['إلى','endDate'],['السبب','reason']]},
 accounting:{title:'دفتر القيود',store:'journal',cols:[['التاريخ','at'],['المرجع','ref'],['النوع','type'],['البيان','note']]},
 users:{title:'المستخدمون',store:'users',cols:[['الاسم','name'],['اسم المستخدم','username'],['الدور','role'],['الحالة','active']]}

};
async function rowsFor(spec){let rows=(await all(spec.store)).filter(x=>sameBranch(x));return rows}
async function exportStore(page,kind='excel'){const spec=specs[page]||specs[A.state.page];if(!spec){toast('لا يوجد قالب تصدير لهذا القسم','warn');return}const rows=await rowsFor(spec),headers=spec.cols.map(x=>x[0]),data=rows.map(r=>spec.cols.map(([,k])=>scalar(r[k])));if(kind==='excel')return exportExcel(spec.title,headers,data);const body=`<div class="meta">عدد السجلات: <b>${rows.length}</b></div><table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${data.slice(0,1500).map(r=>`<tr>${r.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;printHtml(spec.title,body)}
A.exportExcel=exportExcel;A.exportPdf=printHtml;A.exportStore=exportStore;

const exportPages=['products','sales','inventory','purchases','suppliers','customers','expenses','attendance','cash','price_center','offers','loyalty','audit','expiry','recalls','counts','transfers','purchase_orders','supplier_returns','orders','prescriptions','doctors','contracts','track_trace','shortage_notebook','push_list','accounting','users'];
for(const page of exportPages)A.extend(page,async()=>{const head=$('#content .section-actions');if(!head||head.querySelector('[data-export-excel]'))return;head.insertAdjacentHTML('beforeend',`<button class="btn info" data-export-excel="${page}">Excel</button><button class="btn soft" data-export-pdf="${page}">PDF</button>`);head.querySelector(`[data-export-excel="${page}"]`).onclick=()=>exportStore(page,'excel');head.querySelector(`[data-export-pdf="${page}"]`).onclick=()=>exportStore(page,'pdf')});

/* ---------- Safe Excel/CSV import for master data ---------- */
const importSpecs={
 suppliers:{store:'suppliers',title:'الموردين',keys:['phone','name'],fields:{name:['الاسم','name'],phone:['الهاتف','phone'],email:['البريد','email'],address:['العنوان','address'],paymentTermsDays:['أجل السداد','paymentTermsDays']}},
 customers:{store:'customers',title:'العملاء',keys:['phone','name'],fields:{name:['الاسم','name'],phone:['الهاتف','phone'],email:['البريد','email'],address:['العنوان','address'],allergies:['الحساسيات','allergies']}},
 doctors:{store:'doctors',title:'الأطباء',keys:['licenseNo','phone','name'],fields:{name:['الاسم','name'],phone:['الهاتف','phone'],specialty:['التخصص','specialty'],licenseNo:['رقم الترخيص','licenseNo']}},
 contracts:{store:'contracts',title:'التعاقدات',keys:['name'],fields:{name:['الاسم','name'],active:['الحالة','active'],discountPercent:['نسبة الخصم','discountPercent'],patientSharePercent:['تحمل العميل','patientSharePercent'],coverageLimit:['حد التغطية','coverageLimit'],startDate:['بداية','startDate'],endDate:['نهاية','endDate']}}
};
const rowValue=(row,names)=>{for(const n of names)if(row[n]!=null&&text(row[n]).trim()!=='')return text(row[n]).trim();return''};
const importNumberFields=new Set(['paymentTermsDays','discountPercent','patientSharePercent','coverageLimit']);
function mappedMasterRow(row,spec){const out={};for(const [key,names] of Object.entries(spec.fields)){const value=rowValue(row,names);if(value==='')continue;out[key]=importNumberFields.has(key)?num(value):key==='active'?!['false','0','لا','غير نشط'].includes(value.toLowerCase()):value}return out}
for(const [page,spec] of Object.entries(importSpecs))A.extend(page,async()=>{
 const head=$('#content .section-actions');if(!head||head.querySelector(`[data-import-master="${page}"]`))return;head.insertAdjacentHTML('afterbegin',`<button class="btn primary" data-import-master="${page}">استيراد Excel</button>`);head.querySelector(`[data-import-master="${page}"]`).onclick=()=>{
  modal(`استيراد ${spec.title}`,`<div class="ops-file-drop"><b>اختر ملف Excel ‎.xlsx / .xls أو CSV</b><p class="ops-inline-note">سيتم فحص البيانات أولًا، ثم إضافة السجلات الجديدة وتحديث المطابق فقط. الحقول المالية والحركات لا تُستورد من هنا.</p><input id="masterImportFile" type="file" accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"></div><div id="masterImportPreview" class="section-gap"></div>`,`<button class="btn" data-close>إلغاء</button><button id="runMasterImport" class="btn primary">تنفيذ الاستيراد</button>`);
  let parsed=[];$('#masterImportFile').onchange=async e=>{try{parsed=(await readSpreadsheetFile(e.target.files?.[0])).map(r=>mappedMasterRow(r,spec)).filter(r=>r.name);$('#masterImportPreview').innerHTML=`<div class="ops-import-summary"><div class="ops-summary-box"><small>صفوف صالحة</small><b>${parsed.length}</b></div><div class="ops-summary-box"><small>بدون اسم</small><b>0</b></div></div><div class="notice section-gap-sm">معاينة: ${parsed.slice(0,5).map(r=>esc(r.name)).join('، ')||'لا توجد بيانات صالحة'}</div>`}catch(e){parsed=[];toast(e.message||'تعذر قراءة الملف','danger')}};
  $('#runMasterImport').onclick=async()=>{if(!parsed.length){toast('اختر ملفًا صالحًا يحتوي على عمود الاسم','danger');return}const commit=async()=>{const current=await all(spec.store);let created=0,updated=0;for(const row of parsed){const found=current.find(x=>spec.keys.some(k=>row[k]&&text(x[k]).trim().toLowerCase()===text(row[k]).trim().toLowerCase()));if(found){Object.assign(found,row);await put(spec.store,found);updated++}else{const item={...row,id:id(spec.store.slice(0,3)),createdAt:new Date().toISOString(),branchId:A.state.settings?.branchId||null};if(page==='customers')Object.assign(item,{points:0,balance:0});if(page==='suppliers')Object.assign(item,{balance:0});await put(spec.store,item);current.push(item);created++}}await A.audit(`استيراد ${spec.title}`,`جديد ${created} / تحديث ${updated}`);closeModal();toast(`تم الاستيراد: ${created} جديد + ${updated} تحديث`);A.render()};if(R?.enabled&&!R.inAtomic())return R.atomic(commit,'sync');return commit()};
 };
});

/* ---------- A4 sales invoice/PDF ---------- */
A.printSalePdf=async sale=>{
 if(!sale)return;await A.refreshProviderBrand?.(true).catch(()=>{});
 const st=A.state.settings||{},brand=A.state.providerBrand||{},name=st.receiptBusinessName||st.pharmacyName||'الصيدلية';
 const rows=(sale.lines||[]).map(l=>`<tr><td>${esc(l.name)}</td><td>${num(l.qty)} ${esc(A.unitLabel(l.unit))}</td><td>${money(l.unitPrice)}</td><td>${money(l.lineTotal||num(l.qty)*num(l.unitPrice))}</td></tr>`).join('');
 const provider=brand.enabled===false?'':`<div class="footer">Powered by ${esc(brand.name||'Elhafez Technology')}${brand.phone?` • ${esc(brand.phone)}`:''}${brand.website?` • ${esc(brand.website)}`:''}</div>`;
 const body=`<div class="meta"><b>${esc(name)}</b>${st.receiptPhone?` • ${esc(st.receiptPhone)}`:''}${st.receiptAddress?` • ${esc(st.receiptAddress)}`:''}<br>فاتورة <b>${esc(sale.no)}</b> • ${dt(sale.at)} • العميل: ${esc(sale.customerName||'بيع نقدي')} • الكاشير: ${esc(sale.userName||'')}</div><table><thead><tr><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>${rows}</tbody></table><div class="metric-grid"><div class="metric"><small>الإجمالي</small><b>${money(sale.subtotal)}</b></div><div class="metric"><small>الخصم</small><b>${money(num(sale.discount)+num(sale.pointsDiscount)+num(sale.contractDiscount))}</b></div><div class="metric"><small>المطلوب</small><b>${money(sale.total)}</b></div><div class="metric"><small>الدفع</small><b>${esc(sale.paymentLabel||sale.payment||'')}</b></div></div>${provider}`;
 printHtml(`فاتورة ${sale.no}`,body);
};

/* ---------- Settings: operational control ---------- */
A.extend('settings',async()=>{
 const panel=$('[data-set-panel="operation"]');if(!panel||$('#lossControlSettings'))return;const st=A.state.settings||{};
 panel.insertAdjacentHTML('beforeend',`<div id="lossControlSettings" class="card setting-card section-gap"><div class="setting-title"><span class="setting-icon tone-red">◎</span><div><h3>رقابة الوردية ومنع الفاقد</h3><p>إجبار البيع داخل وردية ومطابقة الدرج والجرد المفاجئ.</p></div></div><form id="lossControlForm" class="form-grid two"><label class="check-row"><input name="requireOpenShift" type="checkbox" ${st.requireOpenShift!==false?'checked':''}> منع البيع بدون وردية مفتوحة</label><label class="check-row"><input name="blindShiftClose" type="checkbox" ${st.blindShiftClose!==false?'checked':''}> إغلاق أعمى للكاشير قبل إظهار المتوقع</label><label>حد فرق النقدية المقبول<input name="shiftVarianceTolerance" type="number" min="0" step="0.01" value="${num(st.shiftVarianceTolerance||1)}"></label></form><button id="saveLossControl" class="btn success section-gap-sm">حفظ الرقابة</button></div>`);
 $('#saveLossControl').onclick=async()=>{const fd=new FormData($('#lossControlForm'));A.state.settings={...A.state.settings,requireOpenShift:fd.get('requireOpenShift')==='on',blindShiftClose:fd.get('blindShiftClose')==='on',shiftVarianceTolerance:num(fd.get('shiftVarianceTolerance'))};await put('settings',A.state.settings);await A.audit('تعديل رقابة الوردية','بيع داخل وردية / إغلاق أعمى / حد الفروق');toast('تم حفظ إعدادات الرقابة')};
});

/* ---------- Loss prevention / shift accountability ---------- */
A.extend('cash',async()=>{
 const [shifts,sales,returns,moves,counts]=await Promise.all([all('shifts'),all('sales'),all('returns'),all('stockMoves'),all('counts')]);
 const tol=num(A.state.settings?.shiftVarianceTolerance||1),recent=shifts.filter(s=>sameBranch(s)&&s.status==='closed').sort((a,b)=>new Date(b.closedAt)-new Date(a.closedAt)).slice(0,20);
 const noShift=sales.filter(s=>sameBranch(s)&&!s.shiftId).length;
 const bad=recent.filter(s=>Math.abs(num(s.difference))>tol||Math.abs(num(s.cardDifference))>tol||Math.abs(num(s.walletDifference))>tol);
 const suspiciousMoves=moves.filter(m=>sameBranch(m)&&!['sale','sale_return','purchase','supplier_return','transfer_in','transfer_out','opening','count_adjustment'].includes(m.type)).slice(-50);
 $('#content').insertAdjacentHTML('beforeend',`<div class="card section-gap loss-control-card"><div class="card-title"><div><h3>رقابة الموظفين والفاقد</h3><p class="muted">أي بيع داخل النظام مربوط بالمستخدم والوردية. البيع خارج النظام لا يمكن إثباته برمجيًا وحده؛ يتم كشفه بمطابقة النقدية والجرد الفعلي.</p></div><div class="row-actions"><button id="surpriseCount" class="btn warn">جرد مفاجئ</button><button id="openAuditFromCash" class="btn info">سجل التدقيق</button></div></div><div class="grid three"><div class="card kpi"><small>ورديات بفروق أعلى من الحد</small><strong class="${bad.length?'text-danger':''}">${bad.length}</strong></div><div class="card kpi"><small>فواتير غير مرتبطة بورديات</small><strong class="${noShift?'text-danger':''}">${noShift}</strong></div><div class="card kpi"><small>حركات مخزون غير معتادة</small><strong class="${suspiciousMoves.length?'metric-warn':''}">${suspiciousMoves.length}</strong></div></div><div class="list section-gap-sm">${bad.map(s=>`<div class="list-item"><div><b>${esc(s.userName)}</b><small>${dt(s.openedAt)} ← ${dt(s.closedAt)} • ${num(s.salesCount||0)} فاتورة</small></div><div><b class="text-danger">فرق نقدي ${money(s.difference)}</b></div></div>`).join('')||empty('لا توجد فروق ورديات غير طبيعية في آخر 20 وردية')}</div></div>`);
 $('#surpriseCount').onclick=()=>A.go('counts');$('#openAuditFromCash').onclick=()=>A.go('audit');
});

/* ---------- Staff accountability ---------- */
A.extend('attendance',async()=>{
 const [sales,returns]=await Promise.all([all('sales'),all('returns')]),today=A.today(),users={};
 for(const s of sales.filter(x=>sameBranch(x)&&text(x.at).slice(0,10)===today)){const k=s.userId||s.userName||'unknown';users[k]??={name:s.userName||k,sales:0,total:0,discount:0,returns:0};users[k].sales++;users[k].total+=num(s.total);users[k].discount+=num(s.discount)+num(s.pointsDiscount)+num(s.contractDiscount)}
 for(const r of returns.filter(x=>sameBranch(x)&&text(x.at).slice(0,10)===today)){const k=r.userId||r.userName||'unknown';users[k]??={name:r.userName||k,sales:0,total:0,discount:0,returns:0};users[k].returns++}
 $('#content').insertAdjacentHTML('beforeend',`<div class="card section-gap"><h3>رقابة عمليات الموظفين اليوم</h3><div class="table-wrap"><table class="table compact"><thead><tr><th>الموظف</th><th>فواتير</th><th>المبيعات</th><th>الخصومات</th><th>مرتجعات</th></tr></thead><tbody>${Object.values(users).sort((a,b)=>b.total-a.total).map(x=>`<tr><td>${esc(x.name)}</td><td>${x.sales}</td><td>${money(x.total)}</td><td>${money(x.discount)}</td><td>${x.returns}</td></tr>`).join('')}</tbody></table></div></div>`);
});

/* ---------- Reports: PDF + Excel + shrinkage control ---------- */
A.extendLocal('reports',async()=>{
 const actions=$('#content .section-actions');if(actions&&!$('#reportPdfAll'))actions.insertAdjacentHTML('beforeend','<button id="reportExcelAll" class="btn info">Excel</button><button id="reportPdfAll" class="btn soft">PDF</button>');
 $('#reportExcelAll')?.addEventListener('click',async()=>{const rows=(await all('sales')).filter(sameBranch),headers=['الفاتورة','التاريخ','الكاشير','العميل','الدفع','الإجمالي','الخصم','الربح','الوردية'];exportExcel('تقرير-المبيعات',headers,rows.map(s=>[s.no,s.at,s.userName,s.customerName,s.paymentLabel,s.total,num(s.discount)+num(s.pointsDiscount)+num(s.contractDiscount),s.grossProfit,s.shiftId]))});
 $('#reportPdfAll')?.addEventListener('click',()=>{const body=$('#reportBody')?.innerHTML||'<p>لا توجد بيانات</p>';printHtml('تقرير الصيدلية',body)});
 const shifts=(await all('shifts')).filter(s=>sameBranch(s)&&s.status==='closed').sort((a,b)=>new Date(b.closedAt)-new Date(a.closedAt)).slice(0,10);
 $('#content').insertAdjacentHTML('beforeend',`<div class="card section-gap"><h3>تقرير رقابة الورديات</h3><div class="list">${shifts.map(s=>`<div class="list-item"><div><b>${esc(s.userName)}</b><small>${dt(s.openedAt)} • ${num(s.salesCount||0)} فاتورة</small></div><div>${badge(Math.abs(num(s.difference))<=num(A.state.settings?.shiftVarianceTolerance||1)?'مطابق':'فرق',''+(Math.abs(num(s.difference))<=num(A.state.settings?.shiftVarianceTolerance||1)?'ok':'danger'))}<b>${A.semanticValue(s.difference||0,'variance')}</b></div></div>`).join('')||empty()}</div></div>`);
});

/* ---------- Semantic, modern buttons everywhere ---------- */
function semanticize(root=document){
 root.querySelectorAll?.('button.btn').forEach(b=>{
   if(b.dataset.semanticDone)return;b.dataset.semanticDone='1';const t=(b.textContent||'').trim();
   if(/حذف|إلغاء نهائي|إيقاف|مرتجع|إغلاق واعتماد|إغلاق وردية/.test(t))b.classList.add('danger');
   else if(/حفظ|اعتماد|تحصيل|تشغيل|فتح وردية|إضافة|جديد|دخول|بيع|إتمام/.test(t)&&!b.classList.contains('danger'))b.classList.add('success');
   else if(/تعديل|تحديث|مراجعة|تسوية|جرد|تنبيه/.test(t)&&!b.classList.contains('primary'))b.classList.add('warn');
   else if(/PDF|Excel|تصدير|طباعة|تقرير|فحص|سجل/.test(t))b.classList.add('info');
 });
}
semanticize(document);
new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1)semanticize(n)}).observe(document.body,{childList:true,subtree:true});

/* ---------- Self-check target pages ---------- */
window.PharmaPageSelfCheck=()=>['settings','attendance','cash','offers','price_center','loyalty','clinical_safety','reports'].map(k=>({page:k,registered:typeof A.pages[k]==='function'}));
})();
