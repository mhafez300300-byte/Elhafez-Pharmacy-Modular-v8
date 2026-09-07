'use strict';
const DB_NAME = 'pharmaflow_v6_cache';
const DB_VERSION = 2;
const STORES = [
  'settings','branches','products','batches','customers','suppliers','sales','purchases','expenses','shifts','audit',
  'prescriptions','recalls','counts','transfers','orders','loyalty','users','roles','journal','cashMoves','stockMoves',
  'priceHistory','returns','supplierPayments','customerPayments','purchaseOrders','contracts','claims',
  'heldSales','doctors','offers','cashboxes','supplierReturns','attendance','priceUpdates','importRuns','serialItems','trackEvents','pushList','shortageNotes','deliveryAgents'
];
let dbPromise;
let storageMode = 'unknown';
const memory = Object.fromEntries(STORES.map(s=>[s,[]]));
const LS_PREFIX = 'pharmaflow_v6_cache_';

function localAvailable(){
  try{const k='__pf_test__';localStorage.setItem(k,'1');localStorage.removeItem(k);return true}catch{return false}
}
function loadLocal(store){
  try{return JSON.parse(localStorage.getItem(LS_PREFIX+store)||'[]')}catch{return []}
}
function saveLocal(store,rows){localStorage.setItem(LS_PREFIX+store,JSON.stringify(rows))}

function openIndexedDB(){
  if(!('indexedDB' in globalThis)) return Promise.reject(new Error('IndexedDB غير متاح'));
  return new Promise((resolve,reject)=>{
    try{
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = ()=>{
        const d=req.result;
        for(const s of STORES){if(!d.objectStoreNames.contains(s)) d.createObjectStore(s,{keyPath:'id'})}
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error||new Error('فشل فتح قاعدة البيانات'));
      req.onblocked=()=>reject(new Error('قاعدة البيانات محجوبة'));
    }catch(e){reject(e)}
  });
}
async function ensureMode(){
  if(storageMode!=='unknown') return storageMode;
  try{dbPromise=openIndexedDB();await dbPromise;storageMode='idb'}catch(e){
    dbPromise=null;
    storageMode=localAvailable()?'local':'memory';
    console.warn('Elhafez Pharmacy storage fallback:',storageMode,e);
  }
  return storageMode;
}
async function db(){await ensureMode();return storageMode==='idb'?dbPromise:null}
async function all(store){
  await ensureMode();
  if(storageMode==='local') return loadLocal(store);
  if(storageMode==='memory') return [...memory[store]];
  const d=await dbPromise;return new Promise((res,rej)=>{const r=d.transaction(store).objectStore(store).getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error)});
}
async function get(store,id){
  await ensureMode();
  if(storageMode==='local') return loadLocal(store).find(x=>x.id===id);
  if(storageMode==='memory') return memory[store].find(x=>x.id===id);
  const d=await dbPromise;return new Promise((res,rej)=>{const r=d.transaction(store).objectStore(store).get(id);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
}
async function put(store,value){
  await ensureMode();
  if(storageMode==='local') {const rows=loadLocal(store);const i=rows.findIndex(x=>x.id===value.id);if(i>=0)rows[i]=value;else rows.push(value);saveLocal(store,rows);return value}
  if(storageMode==='memory'){const rows=memory[store];const i=rows.findIndex(x=>x.id===value.id);if(i>=0)rows[i]=value;else rows.push(value);return value}
  const d=await dbPromise;return new Promise((res,rej)=>{const r=d.transaction(store,'readwrite').objectStore(store).put(value);r.onsuccess=()=>res(value);r.onerror=()=>rej(r.error)});
}
async function del(store,id){
  await ensureMode();
  if(storageMode==='local'){saveLocal(store,loadLocal(store).filter(x=>x.id!==id));return}
  if(storageMode==='memory'){memory[store]=memory[store].filter(x=>x.id!==id);return}
  const d=await dbPromise;return new Promise((res,rej)=>{const r=d.transaction(store,'readwrite').objectStore(store).delete(id);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)});
}
async function clear(store){
  await ensureMode();
  if(storageMode==='local'){saveLocal(store,[]);return}
  if(storageMode==='memory'){memory[store]=[];return}
  const d=await dbPromise;return new Promise((res,rej)=>{const r=d.transaction(store,'readwrite').objectStore(store).clear();r.onsuccess=()=>res();r.onerror=()=>rej(r.error)});
}
async function clearAll(){for(const s of STORES) await clear(s)}
async function bulkPut(store,rows=[]){
  await ensureMode();
  if(!rows.length)return rows;
  if(storageMode==='local'){const map=new Map(loadLocal(store).map(x=>[x.id,x]));for(const row of rows)map.set(row.id,row);saveLocal(store,[...map.values()]);return rows}
  if(storageMode==='memory'){const map=new Map(memory[store].map(x=>[x.id,x]));for(const row of rows)map.set(row.id,row);memory[store]=[...map.values()];return rows}
  const d=await dbPromise;return new Promise((res,rej)=>{const tx=d.transaction(store,'readwrite'),os=tx.objectStore(store);for(const row of rows)os.put(row);tx.oncomplete=()=>res(rows);tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error||new Error('فشل حفظ الكاش المحلي'))})
}
const id=(p='id')=>`${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
function mode(){return storageMode}
window.PharmaDB={db,all,get,put,del,clear,clearAll,bulkPut,id,STORES,DB_VERSION,mode};
