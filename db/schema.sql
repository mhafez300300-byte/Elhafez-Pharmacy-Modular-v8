BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version integer PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','trial','expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  username text NOT NULL,
  role text NOT NULL DEFAULT 'كاشير',
  role_key text NOT NULL DEFAULT 'cashier',
  password_hash text,
  pin_hash text,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  max_discount_percent numeric(7,3) NOT NULL DEFAULT 0,
  allow_returns boolean NOT NULL DEFAULT false,
  allow_price_edit boolean NOT NULL DEFAULT false,
  allow_stock_adjust boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  totp_secret_enc text,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, username)
);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  device_id text,
  ip inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS sessions_valid_idx ON sessions(token_hash, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS devices (
  id text NOT NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_ip inet,
  user_agent text,
  trusted boolean NOT NULL DEFAULT false,
  disabled boolean NOT NULL DEFAULT false,
  PRIMARY KEY(tenant_id,id)
);

-- Flexible compatibility store. Keeps V4 data shape while moving persistence to PostgreSQL.
CREATE TABLE IF NOT EXISTS records (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  store text NOT NULL,
  id text NOT NULL,
  branch_id text,
  data jsonb NOT NULL,
  revision bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(tenant_id, store, id)
);
CREATE INDEX IF NOT EXISTS records_store_branch_idx ON records(tenant_id,store,branch_id);
CREATE INDEX IF NOT EXISTS records_data_gin_idx ON records USING gin(data);

CREATE TABLE IF NOT EXISTS audit_logs (
  seq bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id text,
  user_id text,
  user_name text,
  device_id text,
  action text NOT NULL,
  detail text,
  ref text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_tenant_time_idx ON audit_logs(tenant_id,created_at DESC);

CREATE OR REPLACE FUNCTION deny_audit_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs are append-only';
END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS audit_logs_no_update ON audit_logs;
CREATE TRIGGER audit_logs_no_update BEFORE UPDATE OR DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION deny_audit_mutation();

CREATE TABLE IF NOT EXISTS licenses (
  tenant_id uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  license_key_hash text,
  plan text NOT NULL DEFAULT 'trial',
  status text NOT NULL DEFAULT 'trial',
  max_branches integer NOT NULL DEFAULT 1,
  max_users integer NOT NULL DEFAULT 3,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz,
  last_checked_at timestamptz,
  raw_claims jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS doc_sequences (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id text NOT NULL DEFAULT '',
  doc_type text NOT NULL,
  next_value bigint NOT NULL DEFAULT 1,
  PRIMARY KEY(tenant_id,branch_id,doc_type)
);

ALTER TABLE licenses ADD COLUMN IF NOT EXISTS license_key_enc text;

CREATE TABLE IF NOT EXISTS integration_outbox (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  kind text NOT NULL,
  ref text,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','processing','sent','failed','dead')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  external_id text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS integration_outbox_pending_idx ON integration_outbox(status,next_attempt_at);

CREATE TABLE IF NOT EXISTS drug_catalog (
  id bigserial PRIMARY KEY,
  gtin text UNIQUE,
  barcode text,
  name_ar text NOT NULL,
  name_en text,
  active_ingredients jsonb NOT NULL DEFAULT '[]'::jsonb,
  strength text,
  dosage_form text,
  manufacturer text,
  rx boolean,
  controlled_class text,
  official_price numeric(14,3),
  source text,
  source_updated_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS drug_catalog_search_idx ON drug_catalog USING gin(to_tsvector('simple', coalesce(name_ar,'') || ' ' || coalesce(name_en,'') || ' ' || coalesce(barcode,'') || ' ' || coalesce(gtin,'')));

CREATE TABLE IF NOT EXISTS clinical_rules (
  id bigserial PRIMARY KEY,
  rule_type text NOT NULL CHECK(rule_type IN('interaction','allergy','duplicate_ingredient','dose','warning')),
  key_a text NOT NULL,
  key_b text,
  severity text NOT NULL DEFAULT 'warning',
  message_ar text NOT NULL,
  source_name text NOT NULL,
  source_ref text,
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS controlled_dispenses (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sale_id text NOT NULL,
  sale_no text,
  product_id text NOT NULL,
  product_name text,
  batch_id text,
  batch_no text,
  serial_code text,
  qty_base numeric(18,4) NOT NULL,
  patient_name text NOT NULL,
  patient_id_no text,
  prescription_no text NOT NULL,
  prescription_date date,
  doctor_name text,
  doctor_license_no text,
  compliance_document text,
  user_id text,
  user_name text,
  branch_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounting_periods (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  from_date date NOT NULL,
  to_date date NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK(status IN('open','closed')),
  closed_by text,
  closed_at timestamptz,
  UNIQUE(tenant_id,from_date,to_date)
);

CREATE TABLE IF NOT EXISTS chart_accounts (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK(type IN('asset','liability','equity','revenue','expense','cogs')),
  parent_code text,
  active boolean NOT NULL DEFAULT true,
  PRIMARY KEY(tenant_id,code)
);

CREATE TABLE IF NOT EXISTS client_errors (
  id bigserial PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  user_id text,
  device_id text,
  message text NOT NULL,
  stack text,
  page text,
  context jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS backup_runs (
  id bigserial PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  path text,
  sha256 text,
  bytes bigint,
  encrypted boolean NOT NULL DEFAULT true,
  status text NOT NULL,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_state (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO system_state(key,value) VALUES ('change_seq','{"value":0}'::jsonb) ON CONFLICT (key) DO NOTHING;

INSERT INTO schema_migrations(version) VALUES (1) ON CONFLICT DO NOTHING;
COMMIT;
