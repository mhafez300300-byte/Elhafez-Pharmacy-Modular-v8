import { loadConfig } from '../core/config/env.js';
import { PostgresDatabase } from '../core/db/postgres.js';
import { runMigrations } from '../core/db/migrator.js';
import { migrations } from './migrations.js';
import { createApp } from './create-app.js';
import { createCompositionRoot } from './composition-root.js';
import { seedReferenceDrugMaster } from '../modules/drugmaster/infrastructure/seed-reference.js';

const config=loadConfig(),db=new PostgresDatabase(config.databaseUrl);
await runMigrations(db,migrations);
const root=createCompositionRoot(db,config),app=createApp(db,config,root);
const server=app.listen(config.port,config.host,()=>console.log(`Elhafez Pharmacy v8.2.0 clean on ${config.host}:${config.port}`));
if(config.drugMasterAutoSeed)void seedReferenceDrugMaster(db,config.drugMasterSeedFile).then(x=>console.log(`Drug master reference: ${x.seeded?'seeded':'ready'} ${x.count}`)).catch(e=>console.error('Drug master seed failed',e));

async function refreshOperationalAlerts(){try{for(const x of await root.organization.listActiveTenantBranches())await root.alertService.refresh(x.tenantId,x.branchId);}catch(e){console.error('Operational alert worker failed',e);}}
async function cleanupEphemeral(){try{const security=await root.identity.purgeSecurityState(),notifications=await root.notifications.purgeResolved(90);if(security.sessions||security.attempts||notifications)console.log('Cleanup',{...security,notifications});}catch(e){console.error('Security cleanup worker failed',e);}}
const startupAlerts:any=setTimeout(()=>void refreshOperationalAlerts(),15_000);startupAlerts.unref?.();
const alertTimer:any=setInterval(()=>void refreshOperationalAlerts(),config.alertRefreshMinutes*60_000);alertTimer.unref?.();
const cleanupTimer:any=setInterval(()=>void cleanupEphemeral(),config.cleanupHours*3600_000);cleanupTimer.unref?.();

let shuttingDown=false;
async function shutdown(signal:string){if(shuttingDown)return;shuttingDown=true;console.log(`Shutdown: ${signal}`);clearInterval(alertTimer);clearInterval(cleanupTimer);clearTimeout(startupAlerts);server.close(async()=>{await db.close();process.exit(0);});const timer:any=setTimeout(()=>process.exit(1),10_000);timer.unref?.();}
process.on('SIGTERM',()=>void shutdown('SIGTERM'));process.on('SIGINT',()=>void shutdown('SIGINT'));
