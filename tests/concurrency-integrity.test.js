'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {deleteStoreProjections}=require('../dist/modules/compatibility-data/infrastructure/projections');

function captureClient(){const calls=[];return{calls,query:async(sql,args)=>{calls.push({sql,args});return{rowCount:0,rows:[]}}}}

test('full sales cleanup removes the typed sale projection for the tenant',async()=>{
 const c=captureClient();await deleteStoreProjections(c,'tenant-1','sales');
 assert.equal(c.calls.length,1);assert.match(c.calls[0].sql,/DELETE FROM sale_documents_core/);assert.deepEqual(c.calls[0].args,['tenant-1']);
});

test('full returns cleanup removes return inspections before compatibility records are cleared',async()=>{
 const c=captureClient();await deleteStoreProjections(c,'tenant-1','returns');
 assert.match(c.calls[0].sql,/DELETE FROM return_inspections/);
});

test('unprojected stores require no unsafe dynamic SQL',async()=>{
 const c=captureClient();await deleteStoreProjections(c,'tenant-1','customers');assert.equal(c.calls.length,0);
});
