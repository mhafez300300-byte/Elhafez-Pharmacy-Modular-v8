'use strict';
const express=require('express');
const {Pool}=require('pg');
const fs=require('fs');
const path=require('path');
const {createCompositionRoot}=require('./composition-root');
const {createApp}=require('./create-app');

const APP_VERSION='8.0.0';
const PORT=Number(process.env.PORT||3000);
const APP_SECRET=process.env.APP_SECRET||'';
const ROOT_DIR=path.resolve(__dirname,'..','..');

if(!process.env.DATABASE_URL){console.error('DATABASE_URL is required');process.exit(1)}
if(process.env.NODE_ENV==='production'&&APP_SECRET.length<32){console.error('APP_SECRET must be at least 32 characters in production');process.exit(1)}

const pool=new Pool({
 connectionString:process.env.DATABASE_URL,
 ssl:process.env.PGSSL==='require'?{rejectUnauthorized:false}:undefined,
 max:Math.max(2,Math.min(100,Number(process.env.PGPOOL_MAX||20))),
 connectionTimeoutMillis:Math.max(1000,Number(process.env.PGPOOL_CONNECT_TIMEOUT_MS||5000)),
 idleTimeoutMillis:Math.max(1000,Number(process.env.PGPOOL_IDLE_TIMEOUT_MS||30000)),
 application_name:'elhafez-pharmacy'
});

const composition=createCompositionRoot({pool,rootDir:ROOT_DIR,appVersion:APP_VERSION,express});
const app=createApp({express,composition,rootDir:ROOT_DIR});
const services=composition.services;
let httpServer:any;

async function shutdown(signal:string){
 console.log(`Shutdown: ${signal}`);
 const deadline=setTimeout(()=>{console.error('Forced shutdown after graceful deadline');process.exit(1)},10_000);deadline.unref();
 try{if(httpServer)await new Promise<void>(r=>httpServer.close(r));await pool.end();clearTimeout(deadline);process.exit(0)}
 catch(e){clearTimeout(deadline);console.error('Shutdown failed',e);process.exit(1)}
}
process.once('SIGTERM',()=>shutdown('SIGTERM'));process.once('SIGINT',()=>shutdown('SIGINT'));

(async()=>{
 await services.initDb();
 httpServer=app.listen(PORT,'0.0.0.0',()=>console.log(`Elhafez Pharmacy v${APP_VERSION} on 0.0.0.0:${PORT}`));
 setInterval(services.integrationWorker,15_000).unref();
 setInterval(services.catalogFeedSync,6*3600_000).unref();
 setTimeout(services.integrationWorker,3000);
 setTimeout(services.catalogFeedSync,5000);
 setTimeout(services.licenseWorker,7000);
 setInterval(services.licenseWorker,Math.max(5,Number(process.env.LICENSE_CHECK_MINUTES||15))*60_000).unref();
 setTimeout(services.autoUpdateWorker,9000);
 setInterval(services.autoUpdateWorker,6*3600_000).unref();
 const hours=Math.max(1,Number(process.env.BACKUP_INTERVAL_HOURS||24));
 setInterval(async()=>{try{
  for(const t of (await pool.query(`SELECT id FROM tenants WHERE status IN('active','trial')`)).rows)await services.makeBackup(t.id);
  const days=Math.max(1,Number(process.env.BACKUP_RETENTION_DAYS||30));
  const old=(await pool.query(`SELECT id,path FROM backup_runs WHERE created_at<now()-($1||' days')::interval`,[String(days)])).rows;
  for(const b of old){try{if(b.path&&fs.existsSync(b.path))fs.unlinkSync(b.path)}catch{}await pool.query('DELETE FROM backup_runs WHERE id=$1',[b.id])}
 }catch(e){console.error('backup worker',e)}},hours*3600_000).unref();
})().catch(e=>{console.error(e);process.exit(1)});

export {};
