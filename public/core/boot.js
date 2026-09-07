'use strict';
const isAndroid=/ElhafezPharmacyAndroid/i.test(navigator.userAgent);
if('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  if(isAndroid){
    navigator.serviceWorker.getRegistrations().then(list=>Promise.all(list.map(r=>r.unregister()))).catch(()=>{});
    if('caches' in window)caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('elhafez-pharmacy-')).map(k=>caches.delete(k)))).catch(()=>{});
  }else{
    navigator.serviceWorker.register('/sw.js?v=7.1.0',{updateViaCache:'none'}).catch(()=>{});
  }
}
const app=window.PharmaApp;
if(!app||typeof app.init!=='function')throw new Error('APP_RUNTIME_NOT_READY');
app.init().catch(err=>{
  console.error(err);
  const ov=document.getElementById('setupOverlay');
  if(ov){ov.classList.remove('hidden');ov.setAttribute('aria-hidden','false');}
  const card=document.querySelector('.setup-card');
  if(card){
    const old=card.querySelector('.startup-error');if(old)old.remove();
    const box=document.createElement('div');
    box.className='notice danger startup-error';
    box.style.marginBottom='12px';
    box.textContent='حدث خطأ أثناء تشغيل النظام: '+(err?.message||err)+' — أغلق التطبيق وافتحه مرة أخرى، وإن استمر الخطأ تواصل مع الدعم.';
    card.prepend(box);
  }
});
