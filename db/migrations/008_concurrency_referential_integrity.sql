-- Strengthen commercial-core relationships and concurrency lookup paths.
-- NOT VALID keeps legacy databases upgradeable while enforcing constraints for all new/changed rows.
ALTER TABLE batches_core
  ADD CONSTRAINT batches_core_product_fk FOREIGN KEY (tenant_id,product_id)
  REFERENCES products_core(tenant_id,id) NOT VALID;
ALTER TABLE batches_core
  ADD CONSTRAINT batches_core_source_batch_fk FOREIGN KEY (tenant_id,source_batch_id)
  REFERENCES batches_core(tenant_id,id) NOT VALID;

ALTER TABLE sale_lines_core
  ADD CONSTRAINT sale_lines_core_product_fk FOREIGN KEY (tenant_id,product_id)
  REFERENCES products_core(tenant_id,id) NOT VALID;
ALTER TABLE sale_batch_allocations_core
  ADD CONSTRAINT sale_batch_allocations_core_batch_fk FOREIGN KEY (tenant_id,batch_id)
  REFERENCES batches_core(tenant_id,id) NOT VALID;

ALTER TABLE purchase_lines_core
  ADD CONSTRAINT purchase_lines_core_product_fk FOREIGN KEY (tenant_id,product_id)
  REFERENCES products_core(tenant_id,id) NOT VALID;
ALTER TABLE purchase_lines_core
  ADD CONSTRAINT purchase_lines_core_batch_fk FOREIGN KEY (tenant_id,batch_id)
  REFERENCES batches_core(tenant_id,id) NOT VALID;
ALTER TABLE purchase_receipt_layers
  ADD CONSTRAINT purchase_receipt_layers_product_fk FOREIGN KEY (tenant_id,product_id)
  REFERENCES products_core(tenant_id,id) NOT VALID;
ALTER TABLE purchase_receipt_layers
  ADD CONSTRAINT purchase_receipt_layers_batch_fk FOREIGN KEY (tenant_id,batch_id)
  REFERENCES batches_core(tenant_id,id) NOT VALID;

ALTER TABLE stock_ledger_core
  ADD CONSTRAINT stock_ledger_core_product_fk FOREIGN KEY (tenant_id,product_id)
  REFERENCES products_core(tenant_id,id) NOT VALID;
ALTER TABLE stock_ledger_core
  ADD CONSTRAINT stock_ledger_core_batch_fk FOREIGN KEY (tenant_id,batch_id)
  REFERENCES batches_core(tenant_id,id) NOT VALID;

ALTER TABLE return_inspections
  ADD CONSTRAINT return_inspections_sale_fk FOREIGN KEY (tenant_id,sale_id)
  REFERENCES sale_documents_core(tenant_id,id) NOT VALID;
ALTER TABLE return_inspections
  ADD CONSTRAINT return_inspections_product_fk FOREIGN KEY (tenant_id,product_id)
  REFERENCES products_core(tenant_id,id) NOT VALID;
ALTER TABLE return_inspections
  ADD CONSTRAINT return_inspections_batch_fk FOREIGN KEY (tenant_id,batch_id)
  REFERENCES batches_core(tenant_id,id) NOT VALID;

ALTER TABLE sale_lines_core
  ADD CONSTRAINT sale_lines_core_positive_qty_chk CHECK (qty>0 AND qty_base>0) NOT VALID;
ALTER TABLE purchase_lines_core
  ADD CONSTRAINT purchase_lines_core_positive_qty_chk CHECK (packs>0 AND qty_base>0) NOT VALID;
ALTER TABLE stock_ledger_core
  ADD CONSTRAINT stock_ledger_core_nonzero_qty_chk CHECK (qty_base<>0) NOT VALID;
ALTER TABLE return_inspections
  ADD CONSTRAINT return_inspections_positive_qty_chk CHECK (qty_base>0) NOT VALID;
ALTER TABLE sale_documents_core
  ADD CONSTRAINT sale_documents_core_payment_chk CHECK (
    payment IS NULL OR payment IN('cash','card','wallet','bank','credit','insurance','split')
  ) NOT VALID;

CREATE INDEX IF NOT EXISTS sale_documents_core_no_idx
  ON sale_documents_core(tenant_id,branch_id,no) WHERE no IS NOT NULL AND no<>'';
CREATE INDEX IF NOT EXISTS purchase_documents_core_no_idx
  ON purchase_documents_core(tenant_id,branch_id,no) WHERE no IS NOT NULL AND no<>'';
CREATE INDEX IF NOT EXISTS purchase_supplier_invoice_normalized_idx
  ON purchase_documents_core(tenant_id,supplier_id,lower(btrim(supplier_invoice_no)))
  WHERE supplier_invoice_no IS NOT NULL AND btrim(supplier_invoice_no)<>'';
