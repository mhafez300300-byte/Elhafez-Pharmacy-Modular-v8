'use strict';
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const os=require('os');
const {execFile}=require('child_process');
const {promisify}=require('util');
const execFileAsync=promisify(execFile);
const Finance=require('../core/money/finance');
const storePolicy=require('../contracts/store-policy');
const storeOwnership=require('../contracts/store-ownership');
const validation=require('../modules/transactions/domain/commercial-invariants');
const securityPolicy=require('../modules/identity/domain/security-policy');
const {runMigrations}=require('../core/database/migrations');
const projections=require('../modules/compatibility-data/infrastructure/projections');
const createCommonService=require('../core/runtime/common-service');
const {pickDependencies}=require('../core/runtime/pick-dependencies');
const {dependencyManifest}=require('./dependency-manifest');
const {InMemoryEventBus}=require('../core/events/in-memory-event-bus');

const createSystemService=require('../modules/system/application/service');
const createIdentityService=require('../modules/identity/application/service');
const createClinicalService=require('../modules/clinical/application/service');
const createSalesService=require('../modules/sales/application/service');
const createInventoryService=require('../modules/inventory/application/service');
const createPurchasesService=require('../modules/purchases/application/service');
const createDataService=require('../modules/compatibility-data/application/service');
const createReconciliationService=require('../modules/reconciliation/application/service');
const createTransactionsService=require('../modules/transactions/application/service');
const createAccountingService=require('../modules/accounting/application/service');
const createCashService=require('../modules/cash/application/service');
const createBackupService=require('../modules/backup/application/service');
const createPlatformService=require('../modules/platform/application/service');

const routeRegistrars:any[]=[
 ['system',require('../modules/system/api/routes')],
 ['identity',require('../modules/identity/api/routes')],
 ['organization',require('../modules/organization/api/routes')],
 ['sales',require('../modules/sales/api/routes')],
 ['cash',require('../modules/cash/api/routes')],
 ['inventory',require('../modules/inventory/api/routes')],
 ['reporting',require('../modules/reporting/api/routes')],
 ['reconciliation',require('../modules/reconciliation/api/routes')],
 ['compatibility-data',require('../modules/compatibility-data/api/routes')],
 ['transactions',require('../modules/transactions/api/routes')],
 ['clinical',require('../modules/clinical/api/routes')],
 ['integrations',require('../modules/integrations/api/routes')],
 ['accounting',require('../modules/accounting/api/routes')],
 ['backup',require('../modules/backup/api/routes')],
 ['platform',require('../modules/platform/api/routes')]
];

const serviceFactories:any[]=[
 ['system',createSystemService],
 ['__common__',createCommonService],
 ['identity',createIdentityService],
 ['clinical',createClinicalService],
 ['inventory',createInventoryService],
 ['sales',createSalesService],
 ['purchases',createPurchasesService],
 ['compatibility-data',createDataService],
 ['reconciliation',createReconciliationService],
 ['cash',createCashService],
 ['transactions',createTransactionsService],
 ['accounting',createAccountingService],
 ['backup',createBackupService],
 ['platform',createPlatformService]
];

export function createCompositionRoot({pool,rootDir,appVersion,express}:any){
 const services:any={
  pool,rootDir,APP_VERSION:appVersion,APP_SECRET:process.env.APP_SECRET||'',express,
  fs,path,crypto,os,execFileAsync,Finance,eventBus:new InMemoryEventBus(),
  ...storePolicy,...storeOwnership,...validation,...securityPolicy,runMigrations,...projections
 };
 for(const [name,factory] of serviceFactories){
  const keys=name==='__common__'?['crypto']:(dependencyManifest[name]?.service||[]);
  Object.assign(services,factory(pickDependencies(services,keys)));
 }
 return Object.freeze({
  services,
  registerRoutes(app:any){
   for(const [name,register] of routeRegistrars){
    const keys=dependencyManifest[name]?.routes||[];
    register(app,pickDependencies(services,keys));
   }
  }
 });
}
