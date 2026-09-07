const fs=require('fs');
const path=require('path');
const {Pool}=require('pg');
(async()=>{
  if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.PGSSL==='require'?{rejectUnauthorized:false}:undefined});
  const sql=fs.readFileSync(path.join(__dirname,'../db/schema.sql'),'utf8');
  await pool.query(sql);
  console.log('Elhafez Pharmacy database initialized.');
  await pool.end();
})().catch(e=>{console.error(e);process.exit(1)});
