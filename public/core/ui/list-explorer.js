'use strict';
(()=>{
 const views=new Map();
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const norm=v=>String(v??'').trim().toLowerCase();
 function create(key,{size=30,sort=''}={}){
  if(!views.has(key))views.set(key,{key,page:1,size,sort,query:'',filters:{}});
  return views.get(key);
 }
 function reset(v){v.page=1}
 function debounce(fn,wait=120){let t=0;return(...args)=>{clearTimeout(t);t=setTimeout(()=>fn(...args),wait)}}
 function slice(items,v){const total=items.length,pages=Math.max(1,Math.ceil(total/v.size));v.page=clamp(v.page,1,pages);const start=(v.page-1)*v.size;return{items:items.slice(start,start+v.size),total,pages,start,end:Math.min(total,start+v.size)}}
 function controls(v,total,label='نتيجة'){
  const pages=Math.max(1,Math.ceil(total/v.size)),start=total?((v.page-1)*v.size)+1:0,end=Math.min(total,v.page*v.size);
  return `<div class="list-pager" data-list-pager="${v.key}"><div class="list-pager-meta"><b>${total}</b><span>${label}</span><small>${total?`${start}–${end} من ${total}`:'لا توجد نتائج'}</small></div><div class="list-pager-actions"><button type="button" class="pager-btn" data-page-first aria-label="الأولى" ${v.page<=1?'disabled':''}>«</button><button type="button" class="pager-btn" data-page-prev aria-label="السابق" ${v.page<=1?'disabled':''}>‹</button><span class="pager-page">${v.page} / ${pages}</span><button type="button" class="pager-btn" data-page-next aria-label="التالي" ${v.page>=pages?'disabled':''}>›</button><button type="button" class="pager-btn" data-page-last aria-label="الأخيرة" ${v.page>=pages?'disabled':''}>»</button><select class="pager-size" data-page-size aria-label="عدد النتائج"><option value="25" ${v.size===25?'selected':''}>25</option><option value="30" ${v.size===30?'selected':''}>30</option><option value="50" ${v.size===50?'selected':''}>50</option><option value="100" ${v.size===100?'selected':''}>100</option></select></div></div>`
 }
 function bind(root,v,total,redraw){const host=root?.querySelector?.(`[data-list-pager="${v.key}"]`)||document.querySelector(`[data-list-pager="${v.key}"]`);if(!host)return;const pages=Math.max(1,Math.ceil(total/v.size));const move=n=>{v.page=clamp(n,1,pages);redraw()};host.querySelector('[data-page-first]')?.addEventListener('click',()=>move(1));host.querySelector('[data-page-prev]')?.addEventListener('click',()=>move(v.page-1));host.querySelector('[data-page-next]')?.addEventListener('click',()=>move(v.page+1));host.querySelector('[data-page-last]')?.addEventListener('click',()=>move(pages));host.querySelector('[data-page-size]')?.addEventListener('change',e=>{v.size=Number(e.target.value)||30;v.page=1;redraw()})}
 function blob(item,fields){return norm(fields.map(f=>typeof f==='function'?f(item):item?.[f]).join(' '))}
 function sortBy(items,mode,defs={}){const fn=defs[mode];return fn?items.slice().sort(fn):items}
 function activeFilters(values){return Object.values(values||{}).filter(v=>v!==''&&v!==null&&v!==undefined&&v!==false).length}
 function enhanceLargeSelects(root=document,{threshold=8}={}){
  const scope=root?.querySelectorAll?root:document;
  scope.querySelectorAll('select:not([data-smart-select])').forEach(select=>{
   let options=[...select.options],remoteStore={productId:'products',customerId:'customers',supplierId:'suppliers',doctorId:'doctors'}[select.name];if(options.length<threshold&&!remoteStore)return;
   select.dataset.smartSelect='1';
   const search=document.createElement('input');search.type='search';search.className='smart-select-search';search.placeholder=remoteStore?'اكتب حرفًا للبحث…':`بحث سريع داخل ${options.length} اختيار…`;search.autocomplete='off';search.spellcheck=true;search.setAttribute('aria-label','بحث داخل القائمة');
   const meta=document.createElement('small');meta.className='smart-select-meta';meta.textContent=`${options.length} اختيار — اكتب لتصفية القائمة`;
   select.insertAdjacentElement('beforebegin',search);select.insertAdjacentElement('afterend',meta);
   const localRun=()=>{const q=norm(search.value),selected=select.value;let visible=0,first=null;for(const o of options){const match=!q||norm(`${o.textContent} ${o.value}`).includes(q)||o.value===selected,keep=match&&(visible<40||o.value===selected);o.hidden=!keep;o.disabled=o.dataset._smartDisabled==='1'||!keep;if(keep){visible++;if(!first&&!o.disabled)first=o}}meta.textContent=q?`${visible} نتيجة ظاهرة — زد الحروف لتضييق البحث`:`أول ${Math.min(visible,40)} من ${options.length} — اكتب للبحث`;search.classList.toggle('has-filter',!!q);return first};
   const remoteRun=async()=>{const q=search.value.trim();if(!remoteStore||q.length<1)return localRun();meta.textContent='جاري البحث…';try{let rows=[];if(remoteStore==='products')rows=await window.PharmaRemote.posSearch(q,{branchId:window.PharmaApp?.state?.settings?.branchId||'',limit:30});else rows=(await window.PharmaRemote.query(remoteStore,{q,page:1,size:30,sort:'name',dir:'asc'})).items||[];const current=select.value,blank=options.find(o=>!o.value);select.innerHTML=(blank?`<option value="">${blank.textContent}</option>`:'')+rows.map(x=>`<option value="${String(x.id).replace(/[&<>"']/g,'')}">${String(x.name||x.patientName||x.id).replace(/[&<>]/g,'')}</option>`).join('');options=[...select.options];if(options.some(o=>o.value===current))select.value=current;meta.textContent=`${rows.length} نتيجة — زد الحروف لتضييق البحث`;return options.find(o=>o.value)||null}catch(e){meta.textContent='تعذر البحث — أعد المحاولة';return null}};
   const run=()=>remoteStore?remoteRun():localRun();
   for(const o of options)o.dataset._smartDisabled=o.disabled?'1':'0';
   localRun();const deb=debounce(run,180);search.addEventListener('input',deb);search.addEventListener('keydown',async e=>{if(e.key==='Escape'){search.value='';await run();select.focus()}if(e.key==='Enter'&&!select.multiple){e.preventDefault();const first=await run();if(first){select.value=first.value;select.dispatchEvent(new Event('change',{bubbles:true}));select.focus()}}});select.addEventListener('change',()=>{if(search.value)meta.textContent=`تم اختيار ${select.selectedOptions[0]?.textContent||''}`})
  })
 }
 window.ElhafezListExplorer={create,reset,debounce,slice,controls,bind,blob,sortBy,activeFilters,enhanceLargeSelects,norm};
})();
