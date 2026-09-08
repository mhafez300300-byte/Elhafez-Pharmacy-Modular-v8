import type { Migration } from '../../../core/db/migrator.js';
export const settlementMigrations:readonly Migration[]=[{id:'015_settlements',sql:`
CREATE TABLE fin_obligations(
 id text PRIMARY KEY,tenant_id text NOT NULL REFERENCES org_tenants(id) ON DELETE CASCADE,
 party_type text NOT NULL CHECK(party_type IN('customer','supplier')),party_id text NOT NULL,
 reference_type text NOT NULL,reference_id text NOT NULL,original_amount numeric(14,2) NOT NULL CHECK(original_amount>=0),
 balance numeric(14,2) NOT NULL CHECK(balance>=0),status text NOT NULL CHECK(status IN('open','partial','settled')) DEFAULT 'open',created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,reference_type,reference_id));
CREATE INDEX fin_obligations_party_idx ON fin_obligations(tenant_id,party_type,party_id,status,created_at);
CREATE TABLE fin_payments(
 id text PRIMARY KEY,tenant_id text NOT NULL REFERENCES org_tenants(id) ON DELETE CASCADE,branch_id text NOT NULL REFERENCES org_branches(id),
 party_type text NOT NULL CHECK(party_type IN('customer','supplier')),party_id text NOT NULL,direction text NOT NULL CHECK(direction IN('receive','pay')),
 method text NOT NULL CHECK(method IN('cash','card','bank')),amount numeric(14,2) NOT NULL CHECK(amount>0),unallocated numeric(14,2) NOT NULL CHECK(unallocated>=0),reference text NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX fin_payments_party_idx ON fin_payments(tenant_id,party_type,party_id,created_at DESC);
CREATE TABLE fin_allocations(
 id bigserial PRIMARY KEY,payment_id text NOT NULL REFERENCES fin_payments(id) ON DELETE CASCADE,obligation_id text NOT NULL REFERENCES fin_obligations(id),amount numeric(14,2) NOT NULL CHECK(amount>0),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(payment_id,obligation_id));
`},
{id:'034_settlement_perf',sql:`CREATE INDEX fin_obligations_open_party_idx ON fin_obligations(tenant_id,party_type,party_id,created_at) WHERE balance>0;CREATE INDEX fin_obligations_open_time_idx ON fin_obligations(tenant_id,created_at) WHERE balance>0;CREATE INDEX fin_allocations_obligation_idx ON fin_allocations(obligation_id,created_at);`}
];