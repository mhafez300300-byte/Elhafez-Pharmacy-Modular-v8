-- Elhafez Pharmacy v7 commercial core: security, accounting, context and normalized operational projections.
ALTER TABLE users ADD COLUMN IF NOT EXISTS view_cost boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS view_profit boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS allow_refund boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS allow_credit_sale boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS allow_backup_restore boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS allow_period_close boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS allow_period_reopen boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS allow_security_settings boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS allow_waste_disposal boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS allow_controlled_override boolean NOT NULL DEFAULT false;

ALTER TABLE accounting_periods ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE accounting_periods ADD COLUMN IF NOT EXISTS reopened_by text;
ALTER TABLE accounting_periods ADD COLUMN IF NOT EXISTS reopened_at timestamptz;

-- The current branch/cashbox is a user/device execution context, never a shared pharmacy setting.
CREATE TABLE IF NOT EXISTS user_contexts (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id text NOT NULL DEFAULT '',
  branch_id text,
  cashbox_id text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(tenant_id,user_id,device_id)
);

CREATE TABLE IF NOT EXISTS payment_allocations (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  payment_kind text NOT NULL CHECK(payment_kind IN('supplier','customer','refund')),
  payment_id text NOT NULL,
  document_store text NOT NULL CHECK(document_store IN('purchases','sales')),
  document_id text NOT NULL,
  amount numeric(18,4) NOT NULL CHECK(amount>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id,payment_kind,payment_id,document_store,document_id)
);
CREATE INDEX IF NOT EXISTS payment_allocations_doc_idx ON payment_allocations(tenant_id,document_store,document_id);

-- Normalized operational projections. The legacy records table remains the compatibility source during migration,
-- while commercial queries/accounting use these typed projections and foreign-keyable keys.
CREATE TABLE IF NOT EXISTS products_core (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  id text NOT NULL,
  name text NOT NULL DEFAULT '',
  barcode text,
  barcodes text[] NOT NULL DEFAULT '{}',
  gtin text,
  active_ingredient text,
  manufacturer text,
  category text,
  status text NOT NULL DEFAULT 'active',
  sell_price numeric(18,4) NOT NULL DEFAULT 0,
  buy_price numeric(18,4) NOT NULL DEFAULT 0,
  last_purchase_price numeric(18,4) NOT NULL DEFAULT 0,
  average_cost numeric(18,6) NOT NULL DEFAULT 0,
  min_stock numeric(18,4) NOT NULL DEFAULT 0,
  reorder_point numeric(18,4) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(tenant_id,id)
);
CREATE UNIQUE INDEX IF NOT EXISTS products_core_barcode_uq ON products_core(tenant_id,lower(barcode)) WHERE barcode IS NOT NULL AND barcode<>'';
CREATE UNIQUE INDEX IF NOT EXISTS products_core_gtin_uq ON products_core(tenant_id,lower(gtin)) WHERE gtin IS NOT NULL AND gtin<>'';
CREATE INDEX IF NOT EXISTS products_core_search_idx ON products_core USING gin(to_tsvector('simple',coalesce(name,'')||' '||coalesce(active_ingredient,'')||' '||coalesce(manufacturer,'')||' '||coalesce(category,'')));

CREATE TABLE IF NOT EXISTS batches_core (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  id text NOT NULL,
  product_id text NOT NULL,
  branch_id text,
  batch_no text,
  expiry date,
  qty_base numeric(18,4) NOT NULL DEFAULT 0,
  cost_per_base numeric(18,6) NOT NULL DEFAULT 0,
  supplier_id text,
  status text NOT NULL DEFAULT 'available',
  source_batch_id text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS batches_core_fefo_idx ON batches_core(tenant_id,branch_id,product_id,status,expiry,qty_base);
CREATE INDEX IF NOT EXISTS batches_core_batch_idx ON batches_core(tenant_id,product_id,batch_no,expiry);

CREATE TABLE IF NOT EXISTS sale_documents_core (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  id text NOT NULL,
  no text,
  at timestamptz,
  branch_id text,
  customer_id text,
  status text,
  payment text,
  subtotal numeric(18,4) NOT NULL DEFAULT 0,
  discount numeric(18,4) NOT NULL DEFAULT 0,
  tax_total numeric(18,4) NOT NULL DEFAULT 0,
  total numeric(18,4) NOT NULL DEFAULT 0,
  cost numeric(18,4) NOT NULL DEFAULT 0,
  gross_profit numeric(18,4) NOT NULL DEFAULT 0,
  credit_balance numeric(18,4) NOT NULL DEFAULT 0,
  returned_amount numeric(18,4) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS sale_documents_core_time_idx ON sale_documents_core(tenant_id,branch_id,at DESC);
CREATE INDEX IF NOT EXISTS sale_documents_core_customer_idx ON sale_documents_core(tenant_id,customer_id,at DESC);

CREATE TABLE IF NOT EXISTS sale_lines_core (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sale_id text NOT NULL,
  line_no integer NOT NULL,
  product_id text,
  product_name text,
  qty numeric(18,4) NOT NULL DEFAULT 0,
  factor numeric(18,4) NOT NULL DEFAULT 1,
  qty_base numeric(18,4) NOT NULL DEFAULT 0,
  unit_price numeric(18,4) NOT NULL DEFAULT 0,
  line_total numeric(18,4) NOT NULL DEFAULT 0,
  discount_share numeric(18,4) NOT NULL DEFAULT 0,
  tax_rate numeric(9,4) NOT NULL DEFAULT 0,
  tax_amount numeric(18,4) NOT NULL DEFAULT 0,
  net_amount numeric(18,4) NOT NULL DEFAULT 0,
  cost numeric(18,4) NOT NULL DEFAULT 0,
  PRIMARY KEY(tenant_id,sale_id,line_no)
);
CREATE INDEX IF NOT EXISTS sale_lines_core_product_idx ON sale_lines_core(tenant_id,product_id,sale_id);

CREATE TABLE IF NOT EXISTS sale_batch_allocations_core (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sale_id text NOT NULL,
  line_no integer NOT NULL,
  allocation_no integer NOT NULL,
  batch_id text NOT NULL,
  qty_base numeric(18,4) NOT NULL,
  cost_per_base numeric(18,6) NOT NULL DEFAULT 0,
  PRIMARY KEY(tenant_id,sale_id,line_no,allocation_no)
);
CREATE INDEX IF NOT EXISTS sale_batch_allocations_batch_idx ON sale_batch_allocations_core(tenant_id,batch_id,sale_id);

CREATE TABLE IF NOT EXISTS purchase_documents_core (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  id text NOT NULL,
  no text,
  supplier_invoice_no text,
  at timestamptz,
  invoice_date date,
  due_date date,
  branch_id text,
  supplier_id text,
  purchase_order_id text,
  status text NOT NULL DEFAULT 'posted',
  total numeric(18,4) NOT NULL DEFAULT 0,
  tax_total numeric(18,4) NOT NULL DEFAULT 0,
  paid_now numeric(18,4) NOT NULL DEFAULT 0,
  balance numeric(18,4) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS purchase_documents_core_supplier_idx ON purchase_documents_core(tenant_id,supplier_id,due_date,at);
CREATE UNIQUE INDEX IF NOT EXISTS purchase_supplier_invoice_uq ON purchase_documents_core(tenant_id,supplier_id,lower(supplier_invoice_no)) WHERE supplier_invoice_no IS NOT NULL AND supplier_invoice_no<>'';

CREATE TABLE IF NOT EXISTS purchase_lines_core (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  purchase_id text NOT NULL,
  line_no integer NOT NULL,
  product_id text,
  batch_id text,
  batch_no text,
  expiry date,
  packs numeric(18,4) NOT NULL DEFAULT 0,
  bonus_packs numeric(18,4) NOT NULL DEFAULT 0,
  qty_base numeric(18,4) NOT NULL DEFAULT 0,
  unit_cost numeric(18,6) NOT NULL DEFAULT 0,
  tax_rate numeric(9,4) NOT NULL DEFAULT 0,
  tax_amount numeric(18,4) NOT NULL DEFAULT 0,
  line_total numeric(18,4) NOT NULL DEFAULT 0,
  PRIMARY KEY(tenant_id,purchase_id,line_no)
);

-- Keeps supplier provenance even when physical batches are merged.
CREATE TABLE IF NOT EXISTS purchase_receipt_layers (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  id text NOT NULL,
  purchase_id text NOT NULL,
  line_no integer NOT NULL,
  product_id text NOT NULL,
  batch_id text,
  batch_no text,
  expiry date,
  supplier_id text,
  branch_id text,
  qty_received_base numeric(18,4) NOT NULL DEFAULT 0,
  qty_remaining_base numeric(18,4) NOT NULL DEFAULT 0,
  unit_cost numeric(18,6) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS purchase_receipt_layers_fefo_idx ON purchase_receipt_layers(tenant_id,branch_id,product_id,expiry,qty_remaining_base);

CREATE TABLE IF NOT EXISTS stock_ledger_core (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  id text NOT NULL,
  at timestamptz,
  branch_id text,
  product_id text,
  batch_id text,
  qty_base numeric(18,4) NOT NULL DEFAULT 0,
  type text,
  ref text,
  PRIMARY KEY(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS stock_ledger_core_product_time_idx ON stock_ledger_core(tenant_id,branch_id,product_id,at DESC);

CREATE TABLE IF NOT EXISTS journal_entries_core (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  id text NOT NULL,
  at timestamptz,
  branch_id text,
  ref text,
  entry_type text,
  note text,
  debit numeric(18,4) NOT NULL DEFAULT 0,
  credit numeric(18,4) NOT NULL DEFAULT 0,
  PRIMARY KEY(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS journal_lines_core (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  journal_id text NOT NULL,
  line_no integer NOT NULL,
  account_code text,
  account_name text NOT NULL,
  debit numeric(18,4) NOT NULL DEFAULT 0,
  credit numeric(18,4) NOT NULL DEFAULT 0,
  PRIMARY KEY(tenant_id,journal_id,line_no)
);
CREATE INDEX IF NOT EXISTS journal_lines_core_account_idx ON journal_lines_core(tenant_id,account_code,journal_id);

CREATE TABLE IF NOT EXISTS return_inspections (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  return_id text NOT NULL,
  sale_id text NOT NULL,
  line_no integer NOT NULL,
  product_id text,
  batch_id text,
  qty_base numeric(18,4) NOT NULL,
  disposition text NOT NULL CHECK(disposition IN('resalable','quarantine','damaged','expired')),
  reason text NOT NULL,
  inspected_by text,
  inspected_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(tenant_id,return_id,line_no)
);

-- Allow a controlled restore transaction to replace the append-only audit stream.
CREATE OR REPLACE FUNCTION deny_audit_mutation() RETURNS trigger AS $$
BEGIN
  IF current_setting('elhafez.audit_restore',true)='on' THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'audit_logs are append-only';
END; $$ LANGUAGE plpgsql;

-- Core chart of accounts. Existing customer accounts are preserved; only missing codes are seeded.
INSERT INTO chart_accounts(tenant_id,code,name,type,parent_code,active)
SELECT t.id,x.code,x.name,x.type,x.parent_code,true
FROM tenants t
CROSS JOIN (VALUES
 ('1000','الخزينة','asset',NULL),
 ('1010','البنوك','asset','1000'),
 ('1020','وسائل التحصيل الإلكترونية','asset','1000'),
 ('1100','العملاء','asset',NULL),
 ('1150','مطالبات التأمين','asset','1100'),
 ('1200','المخزون','asset',NULL),
 ('1210','ضريبة مدخلات قابلة للاسترداد','asset',NULL),
 ('2000','الموردون','liability',NULL),
 ('2100','ضريبة مخرجات مستحقة','liability',NULL),
 ('3000','حقوق الملكية / أرصدة افتتاحية','equity',NULL),
 ('4000','المبيعات','revenue',NULL),
 ('4010','مردودات المبيعات','revenue','4000'),
 ('4100','إيرادات التوصيل','revenue','4000'),
 ('5000','تكلفة البضاعة المباعة','cogs',NULL),
 ('5100','فروق وتسويات المخزون','expense',NULL),
 ('6000','المصروفات التشغيلية','expense',NULL),
 ('6100','خسائر التلف والانتهاء','expense',NULL)
) AS x(code,name,type,parent_code)
ON CONFLICT(tenant_id,code) DO NOTHING;
