-- Enforce relational and accounting integrity for new commercial-core writes without invalidating legacy rows.
ALTER TABLE sale_lines_core
  ADD CONSTRAINT sale_lines_core_sale_fk FOREIGN KEY (tenant_id,sale_id)
  REFERENCES sale_documents_core(tenant_id,id) ON DELETE CASCADE NOT VALID;

ALTER TABLE sale_batch_allocations_core
  ADD CONSTRAINT sale_batch_allocations_line_fk FOREIGN KEY (tenant_id,sale_id,line_no)
  REFERENCES sale_lines_core(tenant_id,sale_id,line_no) ON DELETE CASCADE NOT VALID;

ALTER TABLE purchase_lines_core
  ADD CONSTRAINT purchase_lines_core_purchase_fk FOREIGN KEY (tenant_id,purchase_id)
  REFERENCES purchase_documents_core(tenant_id,id) ON DELETE CASCADE NOT VALID;

ALTER TABLE purchase_receipt_layers
  ADD CONSTRAINT purchase_receipt_layers_line_fk FOREIGN KEY (tenant_id,purchase_id,line_no)
  REFERENCES purchase_lines_core(tenant_id,purchase_id,line_no) ON DELETE CASCADE NOT VALID;

ALTER TABLE journal_lines_core
  ADD CONSTRAINT journal_lines_core_entry_fk FOREIGN KEY (tenant_id,journal_id)
  REFERENCES journal_entries_core(tenant_id,id) ON DELETE CASCADE NOT VALID;

ALTER TABLE journal_lines_core
  ADD CONSTRAINT journal_lines_core_account_fk FOREIGN KEY (tenant_id,account_code)
  REFERENCES chart_accounts(tenant_id,code) NOT VALID;

ALTER TABLE sale_documents_core
  ADD CONSTRAINT sale_documents_nonnegative_chk CHECK (
    subtotal>=0 AND discount>=0 AND tax_total>=0 AND total>=0 AND cost>=0 AND credit_balance>=0 AND returned_amount>=0
  ) NOT VALID;
ALTER TABLE sale_lines_core
  ADD CONSTRAINT sale_lines_nonnegative_chk CHECK (
    qty>=0 AND factor>0 AND qty_base>=0 AND unit_price>=0 AND line_total>=0 AND discount_share>=0 AND tax_rate>=0 AND tax_amount>=0 AND net_amount>=0 AND cost>=0
  ) NOT VALID;
ALTER TABLE sale_batch_allocations_core
  ADD CONSTRAINT sale_batch_allocations_positive_chk CHECK (qty_base>0 AND cost_per_base>=0) NOT VALID;
ALTER TABLE batches_core
  ADD CONSTRAINT batches_core_nonnegative_chk CHECK (qty_base>=0 AND cost_per_base>=0) NOT VALID;
ALTER TABLE purchase_documents_core
  ADD CONSTRAINT purchase_documents_nonnegative_chk CHECK (total>=0 AND tax_total>=0 AND paid_now>=0 AND balance>=0) NOT VALID;
ALTER TABLE purchase_lines_core
  ADD CONSTRAINT purchase_lines_nonnegative_chk CHECK (packs>=0 AND bonus_packs>=0 AND qty_base>=0 AND unit_cost>=0 AND tax_rate>=0 AND tax_amount>=0 AND line_total>=0) NOT VALID;
ALTER TABLE purchase_receipt_layers
  ADD CONSTRAINT purchase_receipt_layers_qty_chk CHECK (qty_received_base>=0 AND qty_remaining_base>=0 AND qty_remaining_base<=qty_received_base AND unit_cost>=0 AND tax_per_base>=0) NOT VALID;
ALTER TABLE journal_entries_core
  ADD CONSTRAINT journal_entries_balanced_chk CHECK (debit>=0 AND credit>=0 AND abs(debit-credit)<0.01) NOT VALID;
ALTER TABLE journal_lines_core
  ADD CONSTRAINT journal_lines_valid_chk CHECK (debit>=0 AND credit>=0 AND NOT (debit>0 AND credit>0)) NOT VALID;
