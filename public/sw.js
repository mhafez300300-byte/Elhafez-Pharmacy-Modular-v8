const CACHE='elhafez-pharmacy-v7.1.0-shell-1';
const SHELL=['/','/index.html','/core/finance/shared-finance.js?v=7.1.0','/core/storage/pharma-db.js?v=7.1.0','/core/storage/server-bridge.js?v=7.1.0','/core/ui/list-explorer.js?v=7.1.0','/core/app-shell.js?v=7.1.0','/modules/integrations/commercial-features.js?v=7.1.0','/modules/sales/sales-intelligence.js?v=7.1.0','/assets/vendor/fflate.min.js?v=0.8.2','/modules/admin/operations-control.js?v=7.1.0','/modules/remote/commercial-pages.js?v=7.1.0','/core/boot.js?v=7.1.0','/styles/app.css?v=7.1.0','/manifest.webmanifest','/assets/brand/elhafez-pharmacy.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(u.origin!==location.origin||u.pathname.startsWith('/api/')||e.request.method!=='GET')return;
 e.respondWith(fetch(e.request).then(r=>{
   if(r&&r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}
   return r;
 }).catch(async()=>{
   const exact=await caches.match(e.request);
   if(exact)return exact;
   if(e.request.mode==='navigate')return caches.match('/index.html');
   return Response.error();
 }));
});
