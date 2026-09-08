const propertySafe=new Set(['value','checked','selected','disabled','readOnly','multiple','autofocus','tabIndex','textContent']);
const attributeAliases:Record<string,string>={className:'class',htmlFor:'for'};
export function h<K extends keyof HTMLElementTagNameMap>(tag:K,attrs:Record<string,unknown>={},...children:Array<Node|string|number|null|undefined>):HTMLElementTagNameMap[K]{
 const el=document.createElement(tag);
 for(const[k,v]of Object.entries(attrs)){
  if(v==null||v===false)continue;
  if(k==='class'){el.className=String(v);continue;}
  if(k==='html'){el.innerHTML=String(v);continue;}
  if(k==='style'&&typeof v==='string'){el.setAttribute('style',v);continue;}
  if(k.startsWith('on')&&typeof v==='function'){el.addEventListener(k.slice(2).toLowerCase(),v as EventListener);continue;}
  const attr=attributeAliases[k]??k;
  if(propertySafe.has(k)){try{(el as any)[k]=v;continue;}catch{/* attribute fallback */}}
  if(v===true)el.setAttribute(attr,'');else el.setAttribute(attr,String(v));
 }
 for(const c of children){if(c==null)continue;el.append(c instanceof Node?c:document.createTextNode(String(c)));}
 return el;
}
export function money(v:number,c='EGP'){return new Intl.NumberFormat('ar-EG',{style:'currency',currency:c,maximumFractionDigits:2}).format(v||0)}
export function toast(message:string,error=false){document.querySelector('.toast')?.remove();const el=h('div',{class:`toast${error?' error':''}`,role:error?'alert':'status'},message);document.body.append(el);setTimeout(()=>el.remove(),3500)}
export function modal(title:string,body:Node,onSubmit?:(form:HTMLFormElement)=>Promise<void>|void){
 const form=h('form',{class:'modal-form'});form.append(body);
 const save=h('button',{class:'btn primary',type:'submit'},'حفظ');
 const cancel=h('button',{class:'btn',type:'button'},'إلغاء');
 const close=h('button',{class:'icon-close',type:'button','aria-label':'إغلاق'},'×');
 const panel=h('div',{class:'modal',role:'dialog','aria-modal':'true','aria-label':title},h('div',{class:'modal-head'},h('h3',{},title),close),h('div',{class:'modal-body'},form),h('div',{class:'modal-foot'},save,cancel));
 const backdrop=h('div',{class:'modal-backdrop'},panel);
 const dismiss=()=>backdrop.remove();close.onclick=dismiss;cancel.onclick=dismiss;backdrop.addEventListener('click',e=>{if(e.target===backdrop)dismiss()});
 form.addEventListener('submit',async e=>{e.preventDefault();if(save.disabled)return;try{save.disabled=true;save.textContent='جارٍ الحفظ…';if(onSubmit)await onSubmit(form);dismiss();}catch(err:any){toast(err?.message??'تعذر الحفظ',true);save.disabled=false;save.textContent='حفظ';}});
 document.body.append(backdrop);queueMicrotask(()=>{(form.querySelector('input:not([type="hidden"]),select,textarea,button') as HTMLElement|null)?.focus()});return backdrop;
}
