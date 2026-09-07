'use strict';
const fs=require('fs');
const path=require('path');

async function runMigrations(pool:any,rootDir:any){
  const dir=path.join(rootDir,'db','migrations');
  if(!fs.existsSync(dir))return [];
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations(version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
  const applied=new Set((await pool.query('SELECT version FROM schema_migrations')).rows.map(r=>Number(r.version)));
  const files=fs.readdirSync(dir).filter(x=>/^\d+_.+\.sql$/.test(x)).sort((a,b)=>Number(a.split('_')[0])-Number(b.split('_')[0]));
  const done=[];
  for(const file of files){
    const version=Number(file.split('_')[0]);
    if(applied.has(version))continue;
    const sql=fs.readFileSync(path.join(dir,file),'utf8');
    const c=await pool.connect();
    try{
      await c.query('BEGIN');
      await c.query(sql);
      await c.query('INSERT INTO schema_migrations(version) VALUES($1)',[version]);
      await c.query('COMMIT');
      done.push(version);
    }catch(e){
      await c.query('ROLLBACK');
      e.message=`Migration ${version} (${file}) failed: ${e.message}`;
      throw e;
    }finally{c.release()}
  }
  return done;
}
module.exports={runMigrations};

export {};
