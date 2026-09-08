import test from 'node:test';
import assert from 'node:assert/strict';
import { ShortageService } from '../src/modules/shortages/application/shortage-service.js';

const tx:any={query:async()=>({rows:[],rowCount:0}),client:{}};
test('shortage notebook creation and status change are audited atomically',async()=>{
  const calls:string[]=[];let current:any=null;
  const uow:any={withTransaction:async(fn:any)=>fn(tx)};
  const repo:any={
    create:async(v:any)=>{current=v;calls.push('create');return v;},
    get:async()=>current,
    updateStatus:async(_t:string,_id:string,status:string)=>{current={...current,status};calls.push('status');return current;},
    list:async()=>[],
  };
  const audit:any={record:async(i:any)=>calls.push(i.action)};
  const s=new ShortageService(uow,repo,audit);
  const created=await s.create('t1','u1',{branchId:'b1',freeText:'دواء غير موجود',quantity:2,customerName:'عميل',source:'pos_not_found'});
  assert.equal(created.status,'open');
  const fulfilled=await s.status('t1','u1',created.id,'fulfilled');
  assert.equal(fulfilled.status,'fulfilled');
  assert.deepEqual(calls,['create','shortage.created','status','shortage.status']);
});
