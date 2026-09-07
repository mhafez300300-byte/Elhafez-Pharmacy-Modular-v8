-- v7.0.44: remove stale derived purchase projections left by historical failed writes.
-- records is authoritative; no business document is deleted here.
DELETE FROM purchase_receipt_layers l
WHERE NOT EXISTS (SELECT 1 FROM records r WHERE r.tenant_id=l.tenant_id AND r.store='purchases' AND r.id=l.purchase_id);
DELETE FROM purchase_lines_core l
WHERE NOT EXISTS (SELECT 1 FROM records r WHERE r.tenant_id=l.tenant_id AND r.store='purchases' AND r.id=l.purchase_id);
DELETE FROM purchase_documents_core p
WHERE NOT EXISTS (SELECT 1 FROM records r WHERE r.tenant_id=p.tenant_id AND r.store='purchases' AND r.id=p.id);
