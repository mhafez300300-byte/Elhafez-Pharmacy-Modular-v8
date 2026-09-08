export const salesDraftMigrations = [{ id: '037_sales_drafts', sql: `
CREATE TABLE IF NOT EXISTS draft_sales_carts(
 id text PRIMARY KEY, tenant_id text NOT NULL REFERENCES org_tenants(id) ON DELETE CASCADE,
 branch_id text NOT NULL REFERENCES org_branches(id), user_id text NOT NULL REFERENCES id_users(id),
 label text NOT NULL, customer_id text NULL REFERENCES crm_customers(id), payment text NOT NULL,
 invoice_discount numeric(14,2) NOT NULL DEFAULT 0, loyalty_points_to_redeem integer NOT NULL DEFAULT 0,
 lines jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_draft_sales_tenant_branch_updated ON draft_sales_carts(tenant_id,branch_id,updated_at DESC);
` }];
