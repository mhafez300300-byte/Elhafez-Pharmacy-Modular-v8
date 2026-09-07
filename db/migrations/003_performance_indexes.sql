-- JSONB compatibility indexes used by server-side filtering while historical data is projected.
CREATE INDEX IF NOT EXISTS records_sales_at_idx ON records(tenant_id,(data->>'at') DESC) WHERE store='sales' AND data ? 'at';
CREATE INDEX IF NOT EXISTS records_purchases_at_idx ON records(tenant_id,(data->>'at') DESC) WHERE store='purchases' AND data ? 'at';
CREATE INDEX IF NOT EXISTS records_product_name_idx ON records(tenant_id,lower(data->>'name')) WHERE store='products';
CREATE INDEX IF NOT EXISTS records_product_barcode_idx ON records(tenant_id,lower(data->>'barcode')) WHERE store='products';
CREATE INDEX IF NOT EXISTS records_customer_name_idx ON records(tenant_id,lower(data->>'name')) WHERE store='customers';
CREATE INDEX IF NOT EXISTS records_customer_phone_idx ON records(tenant_id,lower(data->>'phone')) WHERE store='customers';
CREATE INDEX IF NOT EXISTS records_supplier_name_idx ON records(tenant_id,lower(data->>'name')) WHERE store='suppliers';
CREATE INDEX IF NOT EXISTS records_batch_product_idx ON records(tenant_id,(data->>'productId'),(data->>'branchId'),(data->>'status'),(data->>'expiry')) WHERE store='batches';
