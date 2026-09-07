'use strict';
module.exports=function create_clinical_service(){

async function clinicalAlertsForProducts(c:any,tenantId:any,productIds:any=[],customerId:any='',extraAllergies:any=''){
 const ids=[...new Set((productIds||[]).map(String).filter(Boolean))];if(!ids.length)return[];
 let allergies=String(extraAllergies||'');if(customerId){const cr=(await c.query(`SELECT data FROM records WHERE tenant_id=$1 AND store='customers' AND id=$2`,[tenantId,String(customerId)])).rows[0]?.data;if(cr?.allergies)allergies=[allergies,cr.allergies].filter(Boolean).join(',')}
 const allergyTerms=allergies.toLowerCase().split(/[,،;\n]/).map(x=>x.trim()).filter(Boolean),q=await c.query(`SELECT id,data FROM records WHERE tenant_id=$1 AND store='products' AND id=ANY($2::text[])`,[tenantId,ids]),ingredients=[];
 for(const r of q.rows){const vals=Array.isArray(r.data.activeIngredients)?r.data.activeIngredients:String(r.data.active||'').split(/[+\/،,]/);for(const x of vals.map(String).map(x=>x.trim().toLowerCase()).filter(Boolean))ingredients.push({productId:r.id,product:r.data.name,ingredient:x})}
 const alerts:any[]=[],seen:any={};for(const x of ingredients)seen[x.ingredient]=(seen[x.ingredient]||[]).concat(x.product);for(const [ing,ps] of Object.entries(seen) as any[])if(new Set(ps).size>1)alerts.push({type:'duplicate_ingredient',severity:'warning',message:`تكرار مادة فعالة (${ing}) في: ${[...new Set(ps)].join('، ')}`,source:'محرك Elhafez Pharmacy - يعتمد على بيانات المادة الفعالة المسجلة'});
 if(allergyTerms.length)for(const x of ingredients)if(allergyTerms.some(a=>x.ingredient.includes(a)||a.includes(x.ingredient)))alerts.push({type:'allergy',severity:'danger',message:`المادة ${x.ingredient} قد تطابق حساسية مسجلة للمريض`,source:'مطابقة نصية فقط - تتطلب مراجعة صيدلي'});
 if(ingredients.length){const keys=[...new Set(ingredients.map(x=>x.ingredient))],rules=(await c.query(`SELECT * FROM clinical_rules WHERE active=true AND rule_type='interaction' AND key_a=ANY($1::text[]) AND (key_b IS NULL OR key_b=ANY($1::text[]))`,[keys])).rows;for(const r of rules)alerts.push({type:r.rule_type,severity:r.severity,message:r.message_ar,source:r.source_name,sourceRef:r.source_ref})}
 return alerts;
}
 return {clinicalAlertsForProducts};
};

export {};
