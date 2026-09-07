'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function tsFiles(dir){const out=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())out.push(...tsFiles(p));else if(e.name.endsWith('.ts')&&!e.name.endsWith('.d.ts'))out.push(p)}return out}
test('TypeScript composition root is small and business modules are explicit',()=>{const s=read('src/app/composition-root.ts');assert.ok(s.split(/\r?\n/).length<180);for(const m of ['identity','organization','catalog','inventory','customers','suppliers','sales','purchases','cash','accounting','clinical','contracts','loyalty','reporting','reconciliation','transactions','integrations','backup','platform'])assert.ok(fs.existsSync(path.join(root,'src/modules',m,'index.ts')),m)});
test('core never imports business modules',()=>{for(const f of tsFiles(path.join(root,'src/core'))){const s=fs.readFileSync(f,'utf8');assert.doesNotMatch(s,/from\s+['\"][^'\"]*modules\//,path.relative(root,f));assert.doesNotMatch(s,/require\(['\"][^'\"]*modules\//,path.relative(root,f))}});
test('business modules do not import another module internals',()=>{const base=path.join(root,'src/modules');for(const f of tsFiles(base)){const rel=path.relative(base,f).replace(/\\/g,'/'),owner=rel.split('/')[0],s=fs.readFileSync(f,'utf8');for(const m of s.matchAll(/(?:from\s+|require\()['\"]([^'\"]+)['\"]/g)){const spec=m[1];const hit=spec.match(/modules\/([^/]+)/);if(hit)assert.equal(hit[1],owner,`${rel} imports ${hit[1]}`)}}});
test('backend never imports presentation files',()=>{for(const f of tsFiles(path.join(root,'src'))){const s=fs.readFileSync(f,'utf8');assert.doesNotMatch(s,/(?:require\(|from\s+)['\"][^'\"]*public\//,path.relative(root,f))}});
test('every compatibility store has declared ownership',()=>{const {STORES}=require('../dist/contracts/store-policy');const {STORE_OWNERS}=require('../dist/contracts/store-ownership');assert.deepEqual([...STORES].filter(x=>!STORE_OWNERS[x]),[])});
test('frontend monolith stays removed and presentation is independently split',()=>{assert.equal(fs.existsSync(path.join(root,'public/app.js')),false);for(const p of ['public/core/app-shell.js','public/modules/catalog/products.js','public/modules/sales/pos-and-fulfillment.js','public/modules/admin/settings-and-audit.js','public/modules/operations/master-pages.js'])assert.ok(fs.existsSync(path.join(root,p)))});
test('database changes remain migration-owned',()=>{assert.ok(fs.existsSync(path.join(root,'db/migrations')));for(const f of tsFiles(path.join(root,'src/modules'))){const s=fs.readFileSync(f,'utf8');assert.doesNotMatch(s,/ALTER TABLE|CREATE TABLE/,`schema DDL leaked into ${path.relative(root,f)}`)}});
test('business capability ownership stays in the responsible module',()=>{
 const cash=read('src/modules/cash/application/service.ts'),purchases=read('src/modules/purchases/application/service.ts');
 const inventory=read('src/modules/inventory/application/service.ts'),sales=read('src/modules/sales/application/service.ts'),clinical=read('src/modules/clinical/application/service.ts');
 assert.match(cash,/function prepareShiftCommercial/);assert.match(cash,/function prepareExpenseCommercial/);
 assert.doesNotMatch(purchases,/function prepareShiftCommercial/);assert.doesNotMatch(purchases,/function prepareExpenseCommercial/);
 assert.match(inventory,/function consumeReceiptProvenance/);assert.match(inventory,/function restoreReceiptProvenance/);
 assert.doesNotMatch(sales,/function consumeReceiptProvenance/);assert.doesNotMatch(sales,/function restoreReceiptProvenance/);
 assert.match(clinical,/function clinicalAlertsForProducts/);assert.doesNotMatch(sales,/function clinicalAlertsForProducts/);
});
test('module factories use explicit dependency contracts instead of open service-locator contexts',()=>{
 for(const f of tsFiles(path.join(root,'src/modules'))){const s=fs.readFileSync(f,'utf8');if(!/module\.exports=function/.test(s))continue;assert.doesNotMatch(s,/module\.exports=function\s+[^\n(]+\([^)]*ctx:any/,path.relative(root,f));}
});
test('TypeScript checking cannot be disabled in source',()=>{for(const f of tsFiles(path.join(root,'src'))){assert.doesNotMatch(fs.readFileSync(f,'utf8'),/@ts-nocheck/,path.relative(root,f))}});
test('legacy JavaScript backend sources and root server entrypoint stay removed',()=>{assert.equal(fs.existsSync(path.join(root,'server.js')),false);const bad=[];const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(e.name.endsWith('.js'))bad.push(path.relative(root,p))}};walk(path.join(root,'src'));assert.deepEqual(bad,[])});
