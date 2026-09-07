#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');

function badSecret(v){
  const s=String(v||'').trim();
  return s.length<32 || /replace-with|change_me|changeme|example|password/i.test(s);
}
function placeholder(v){return /change_me|replace-with|localhost|example/i.test(String(v||''))}
function evaluate(env=process.env){
  const blockers=[],warnings=[];
  if(String(env.NODE_ENV||'')!=='production') warnings.push('NODE_ENV_NOT_PRODUCTION');
  if(!env.DATABASE_URL || placeholder(env.DATABASE_URL)) blockers.push('DATABASE_URL_NOT_PRODUCTION');
  if(badSecret(env.APP_SECRET)) blockers.push('APP_SECRET_WEAK_OR_MISSING');
  if(badSecret(env.BACKUP_SECRET)) blockers.push('BACKUP_SECRET_WEAK_OR_MISSING');
  if(!env.BACKUP_UPLOAD_URL) blockers.push('EXTERNAL_BACKUP_NOT_CONFIGURED');
  if(!env.OWNER_CENTER_URL) warnings.push('OWNER_CENTER_URL_MISSING');
  if(!env.OWNER_PRODUCT_CODE) warnings.push('OWNER_PRODUCT_CODE_MISSING');
  if(!env.INSTANCE_NAME) warnings.push('INSTANCE_NAME_MISSING');
  if(String(env.ALLOW_STANDALONE_SETUP||'false').toLowerCase()==='true') warnings.push('STANDALONE_SETUP_ENABLED');
  return {ok:blockers.length===0,blockers,warnings};
}

if(require.main===module){
  const result=evaluate();
  console.log(JSON.stringify({app:'Elhafez Pharmacy',version:require('../package.json').version,...result},null,2));
  if(!result.ok) process.exitCode=1;
}
module.exports={evaluate,badSecret,placeholder};
