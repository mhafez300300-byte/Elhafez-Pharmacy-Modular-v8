import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('src/modules');
async function walk(dir){const out=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())out.push(...await walk(p));else if(e.isFile()&&p.endsWith('.ts'))out.push(p);}return out;}
const files=await walk(root),violations=[];
for(const file of files){const rel=path.relative(root,file).replaceAll('\\','/'),owner=rel.split('/')[0];const text=await readFile(file,'utf8');for(const m of text.matchAll(/from\s+['"]([^'"]+)['"]/g)){const spec=m[1];if(!spec.startsWith('.'))continue;const resolved=path.resolve(path.dirname(file),spec.replace(/\.js$/,''));const targetRel=path.relative(root,resolved).replaceAll('\\','/');if(targetRel.startsWith('..'))continue;const parts=targetRel.split('/');const target=parts[0];if(!target||target===owner)continue;if(parts[1]!=='contracts')violations.push(`${rel}: imports implementation from ${target}: ${spec}`);}}
if(violations.length){console.error('Architecture violations:\n'+violations.join('\n'));process.exit(1);}console.log(`Architecture check PASS — ${files.length} module source files checked.`);
