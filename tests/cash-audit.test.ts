import test from 'node:test';
import assert from 'node:assert/strict';
import { CashService } from '../src/modules/cash/application/cash-service.js';
const tx:any={query:async()=>({rows:[],rowCount:0}),client:{}};
test('shift open and close are audited inside the same transaction',async()=>{
  const calls:string[]=[];
  const uow:any={withTransaction:async(fn:any)=>fn(tx)};
  const shift={id:'sh1',tenantId:'t1',branchId:'b1',userId:'u1',openedAt:new Date().toISOString(),closedAt:null,openingCash:1000,closingCash:null,expectedCash:null,variance:null,status:'open'} as const;
  const cash:any={
    openShift:async(_i:any,got:any)=>{assert.equal(got,tx);calls.push('open');return shift;},
    getShift:async()=>shift,
    closeShift:async(_i:any,got:any)=>{assert.equal(got,tx);calls.push('close');return {...shift,status:'closed',closingCash:1000,expectedCash:1000,variance:0,closedAt:new Date().toISOString()};}
  };
  const audit:any={record:async(i:any,got:any)=>{assert.equal(got,tx);calls.push(i.action);}};
  const service=new CashService(uow,cash,audit);
  await service.openShift({id:'sh1',tenantId:'t1',branchId:'b1',userId:'u1',openingCash:1000});
  await service.closeShift({tenantId:'t1',userId:'u1',shiftId:'sh1',closingCash:1000});
  assert.deepEqual(calls,['open','shift.opened','close','shift.closed']);
});
