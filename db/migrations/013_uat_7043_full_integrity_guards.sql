-- v7.0.45: UAT-7043 full integrity guards. Idempotent and non-destructive.
CREATE INDEX IF NOT EXISTS idx_records_open_shift_context
ON records(tenant_id,(data->>'userId'),(data->>'branchId'),(data->>'cashboxId'))
WHERE store='shifts' AND COALESCE(data->>'status','')='open';

CREATE INDEX IF NOT EXISTS idx_records_supplier_identity
ON records(tenant_id,(lower(btrim(COALESCE(data->>'name','')))),(lower(btrim(COALESCE(data->>'taxNumber','')))))
WHERE store='suppliers';

CREATE INDEX IF NOT EXISTS idx_purchase_docs_supplier_invoice_lookup
ON purchase_documents_core(tenant_id,supplier_id,(lower(btrim(COALESCE(supplier_invoice_no,'')))));

-- Enforce one open shift for the authoritative user/branch/cashbox context for new/updated rows.
CREATE OR REPLACE FUNCTION guard_open_shift_uniqueness() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.store='shifts' AND COALESCE(NEW.data->>'status','')='open' THEN
  IF EXISTS(SELECT 1 FROM records r WHERE r.tenant_id=NEW.tenant_id AND r.store='shifts' AND r.id<>NEW.id AND COALESCE(r.data->>'status','')='open' AND COALESCE(r.data->>'userId','')=COALESCE(NEW.data->>'userId','') AND COALESCE(r.data->>'branchId','')=COALESCE(NEW.data->>'branchId','') AND COALESCE(r.data->>'cashboxId','cash_main')=COALESCE(NEW.data->>'cashboxId','cash_main')) THEN
   RAISE EXCEPTION 'SHIFT_ALREADY_OPEN' USING ERRCODE='23505';
  END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_open_shift_uniqueness ON records;
CREATE TRIGGER trg_guard_open_shift_uniqueness BEFORE INSERT OR UPDATE OF data ON records FOR EACH ROW EXECUTE FUNCTION guard_open_shift_uniqueness();
