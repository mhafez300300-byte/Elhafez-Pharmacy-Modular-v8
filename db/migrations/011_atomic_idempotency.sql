CREATE TABLE IF NOT EXISTS atomic_requests (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  intent text NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id,idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_atomic_requests_created_at ON atomic_requests(created_at);
