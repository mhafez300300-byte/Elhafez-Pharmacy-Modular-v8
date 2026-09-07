-- Preserve the recoverable-tax component per received base unit so supplier credit notes
-- can reverse inventory and input VAT against the exact remaining receipt provenance.
ALTER TABLE purchase_receipt_layers
  ADD COLUMN IF NOT EXISTS tax_per_base numeric(18,6) NOT NULL DEFAULT 0;

UPDATE purchase_receipt_layers r
SET tax_per_base = CASE WHEN p.qty_base<>0 THEN p.tax_amount/p.qty_base ELSE 0 END
FROM purchase_lines_core p
WHERE p.tenant_id=r.tenant_id AND p.purchase_id=r.purchase_id AND p.line_no=r.line_no
  AND r.tax_per_base=0;

CREATE INDEX IF NOT EXISTS purchase_receipt_layers_batch_supplier_idx
  ON purchase_receipt_layers(tenant_id,batch_id,supplier_id,qty_remaining_base,created_at);
