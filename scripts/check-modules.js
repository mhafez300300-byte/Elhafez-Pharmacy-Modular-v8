'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=path.join(__dirname,'..');
const src=path.join(root,'src'),dist=path.join(root,'dist'),publicDir=path.join(root,'public');
const walk=(dir,pred=()=>true)=>fs.existsSync(dir)?fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{const p=path.join(dir,e.name);return e.isDirectory()?walk(p,pred):(pred(p)?[p]:[])}):[];
const source=walk(src,p=>/\.tsx?$/.test(p));
const legacyJs=walk(src,p=>p.endsWith('.js'));
if(legacyJs.length)throw new Error('JavaScript source remains under src: '+legacyJs.join(', '));
if(fs.existsSync(path.join(root,'server.js')))throw new Error('Legacy root server.js must not exist');
if(fs.existsSync(path.join(publicDir,'app.js')))throw new Error('Legacy frontend monolith public/app.js must not exist');
for(const f of source){const text=fs.readFileSync(f,'utf8');if(/@ts-nocheck/.test(text))throw new Error('Type checking disabled in '+f)}
const composition=path.join(src,'app','composition-root.ts');
const lines=fs.readFileSync(composition,'utf8').split(/\r?\n/).length;if(lines>180)throw new Error('Composition root grew too large: '+lines+' lines');
for(const mod of fs.readdirSync(path.join(src,'modules'),{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>x.name)){
 const dir=path.join(src,'modules',mod),hasBoundary=fs.existsSync(path.join(dir,'api','routes.ts'))||fs.existsSync(path.join(dir,'application','service.ts'));
 if(hasBoundary&&!fs.existsSync(path.join(dir,'index.ts')))throw new Error('Module descriptor missing: '+mod);
 const contract=path.join(dir,'contracts','dependencies.ts');
 const implementation=[path.join(dir,'api','routes.ts'),path.join(dir,'application','service.ts')].filter(fs.existsSync);
 if(implementation.some(f=>/module\.exports=function\s+[^\n(]+\([^)]*ctx:any/.test(fs.readFileSync(f,'utf8'))))throw new Error('Open service-locator factory context found in '+mod);
 if(implementation.some(f=>/Dependencies/.test(fs.readFileSync(f,'utf8')))&&!fs.existsSync(contract))throw new Error('Dependency contract missing: '+mod);
}
for(const f of walk(dist,p=>p.endsWith('.js')).concat(walk(publicDir,p=>p.endsWith('.js'))))cp.execFileSync(process.execPath,['--check',f],{stdio:'pipe'});
console.log(`Architecture OK: ${source.length} TypeScript source files; composition root ${lines} lines.`);
