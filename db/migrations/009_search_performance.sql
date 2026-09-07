-- Commercial search/list indexes. These are additive and safe for existing databases.
CREATE INDEX IF NOT EXISTS products_core_tenant_status_name_idx
  ON products_core(tenant_id,status,lower(name),id);
CREATE INDEX IF NOT EXISTS products_core_tenant_category_name_idx
  ON products_core(tenant_id,category,lower(name),id);
CREATE INDEX IF NOT EXISTS products_core_barcodes_gin_idx
  ON products_core USING gin(barcodes);

CREATE INDEX IF NOT EXISTS records_sales_customer_at_idx
  ON records(tenant_id,(data->>'customerId'),(data->>'at') DESC)
  WHERE store='sales' AND data ? 'at';
CREATE INDEX IF NOT EXISTS records_sales_status_at_idx
  ON records(tenant_id,(data->>'status'),(data->>'at') DESC)
  WHERE store='sales' AND data ? 'at';
CREATE INDEX IF NOT EXISTS records_purchases_supplier_at_idx
  ON records(tenant_id,(data->>'supplierId'),(data->>'at') DESC)
  WHERE store='purchases' AND data ? 'at';
CREATE INDEX IF NOT EXISTS records_purchases_status_at_idx
  ON records(tenant_id,(data->>'status'),(data->>'at') DESC)
  WHERE store='purchases' AND data ? 'at';
CREATE INDEX IF NOT EXISTS records_customer_code_idx
  ON records(tenant_id,lower(data->>'code')) WHERE store='customers';
CREATE INDEX IF NOT EXISTS records_supplier_code_idx
  ON records(tenant_id,lower(data->>'code')) WHERE store='suppliers';
