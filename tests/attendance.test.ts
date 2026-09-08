import test from 'node:test';
import assert from 'node:assert/strict';
import { AttendanceService } from '../src/modules/attendance/application/attendance-service.js';

const tx:any={query:async()=>({rows:[],rowCount:0}),client:{}};

test('attendance check-in and check-out are audited in one transaction',async()=>{
  const calls:string[]=[];
  let open:any=null;
  const uow:any={withTransaction:async(fn:any)=>fn(tx)};
  const repo:any={
    getOpen:async()=>open,
    checkIn:async(input:any)=>{calls.push('check-in');open={...input,checkIn:'2026-09-08T00:00:00.000Z',checkOut:null};return open;},
    checkOut:async()=>{calls.push('check-out');open={...open,checkOut:'2026-09-08T08:00:00.000Z'};return open;},
    history:async()=>[],
  };
  const org:any={getDefaultBranch:async()=>({id:'b1',tenantId:'t1',name:'الرئيسي',active:true}),listBranches:async()=>[]};
  const audit:any={record:async(input:any)=>calls.push(input.action)};
  const service=new AttendanceService(uow,repo,org,audit);
  const arrived=await service.checkIn('t1','u1');
  assert.equal(arrived.branchId,'b1');
  const left=await service.checkOut('t1','u1');
  assert.ok(left.checkOut);
  assert.deepEqual(calls,['check-in','attendance.check_in','check-out','attendance.check_out']);
});
