-- Commercial completion: payment allocation traceability, reporting preferences and accounting accounts.
ALTER TABLE payment_allocations
  ADD COLUMN IF NOT EXISTS counterparty_id text;

CREATE INDEX IF NOT EXISTS idx_payment_allocations_counterparty
  ON payment_allocations(tenant_id,payment_kind,counterparty_id,created_at DESC);

CREATE TABLE IF NOT EXISTS report_favorites (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(tenant_id,user_id,report_key)
);

INSERT INTO chart_accounts(tenant_id,code,name,type,active)
SELECT t.id,v.code,v.name,v.type,true
FROM tenants t
CROSS JOIN (VALUES
 ('3000','أرصدة افتتاحية','equity'),
 ('4010','مردودات ومسموحات المبيعات','revenue'),
 ('4200','فروق زيادة المخزون','revenue'),
 ('5100','فروق وعجز المخزون','expense')
) AS v(code,name,type)
ON CONFLICT (tenant_id,code) DO UPDATE SET name=EXCLUDED.name,type=EXCLUDED.type,active=true;
