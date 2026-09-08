# Core Workflows

## Cash sale
1. Validate request.
2. Resolve products through Catalog contract.
3. Allocate FEFO through Inventory contract with row locks.
4. Require an open cash shift.
5. Save Sales invoice and lines.
6. Record Cash movement.
7. Post balanced Accounting journal.
8. Write Audit event.
9. Commit once; otherwise rollback everything.

## Purchase receipt
1. Validate supplier and products.
2. Create receipt document.
3. Create inventory batches and receipt movements.
4. If cash, require open shift and record outflow.
5. Post Inventory/AP-or-Cash journal.
6. Audit and commit.

## Sale return
1. Load original posted sale.
2. Validate return quantity.
3. Return stock to original batch only when classified sellable; otherwise isolate in return holds.
4. Record refund/credit adjustment.
5. Post reversing journal and audit.
6. Commit once.
