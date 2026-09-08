import test from 'node:test';
import assert from 'node:assert/strict';
import { Party360Service } from '../src/modules/party360/application/party360-service.js';

test('customer 360 keeps receivable separate and computes available credit',async()=>{
  const customers:any={get:async()=>({id:'c1',tenantId:'t',name:'عميل',phone:null,creditLimit:1000,active:true})};
  const suppliers:any={get:async()=>null};
  const sales:any={listByCustomer:async()=>[{id:'s1',total:600,createdAt:'2026-09-07T10:00:00Z'}]};
  const purchases:any={listBySupplier:async()=>[]};
  const settlements:any={balance:async()=>250,listObligations:async()=>[{balance:250}],listPayments:async()=>[{direction:'receive',amount:350,createdAt:'2026-09-07T12:00:00Z'}]};
  const service=new Party360Service(customers,suppliers,sales,purchases,settlements);
  const view=await service.customer('t','c1');
  assert.equal(view.outstanding,250);
  assert.equal(view.availableCredit,750);
  assert.equal(view.salesTotal,600);
  assert.equal(view.receivedTotal,350);
});
