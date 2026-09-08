import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('src/modules');
async function walk(dir){const out=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())out.push(...await walk(p));else if(e.isFile()&&p.endsWith('.ts'))out.push(p);}return out;}
const ownerRules=[
  [/^org_/,'organization'],[/^id_/,'identity'],[/^idem_/,'idempotency'],[/^audit_/,'audit'],[/^cat_/,'catalog'],[/^crm_customers$/,'customers'],[/^crm_suppliers$/,'suppliers'],[/^sys_/,'settings'],[/^platform_/,'platform'],[/^inv_/,'inventory'],[/^cash_/,'cash'],[/^acc_/,'accounting'],[/^sales_/,'sales'],[/^purchase_/,'purchases'],[/^notifications$/,'notifications'],[/^fin_/,'settlements'],[/^exp_/,'expenses'],[/^ph_/,'clinical'],[/^pr_/,'pricing'],[/^loy_/,'loyalty'],[/^attendance_/,'attendance'],[/^drug_master$/,'drugmaster'],[/^draft_/,'salesdrafts'],[/^ins_/,'insurance'],[/^trace_/,'tracktrace'],[/^ops_shortages$/,'shortages'],
];
const mutation=/\b(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|ALTER\s+TABLE|CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?|DROP\s+TABLE(?:\s+IF\s+EXISTS)?|TRUNCATE(?:\s+TABLE)?)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi;
const violations=[];let writes=0;
for(const file of await walk(root)){
  const rel=path.relative(root,file).replaceAll('\\','/'),moduleName=rel.split('/')[0];
  if(moduleName==='backup')continue; // documented whole-instance restore exception
  const text=await readFile(file,'utf8');
  for(const match of text.matchAll(mutation)){
    const table=match[1].toLowerCase();if(table==='set')continue;
    const owner=ownerRules.find(([rx])=>rx.test(table))?.[1];if(!owner)continue;
    writes++;
    if(owner!==moduleName)violations.push(`${rel}: mutates ${table}, owned by ${owner}`);
  }
}
if(violations.length){console.error('Database ownership violations:\n'+violations.join('\n'));process.exit(1);}
console.log(`Database ownership check PASS — ${writes} owned-table mutations inspected.`);
