# Database Ownership

Every mutation belongs to exactly one business module. Application flows call another module through its public contract; they do not write its tables directly.

- `org_*` → organization
- `id_*` → identity
- `idem_*` → idempotency
- `platform_*` → platform
- `cat_*` → catalog
- `crm_customers` → customers
- `crm_suppliers` → suppliers
- `inv_*` → inventory
- `cash_*` → cash
- `acc_*` → accounting
- `sales_*` → sales
- `purchase_*` → purchases
- `fin_*` → settlements / receivables / payables
- `exp_*` → expenses
- `ph_*` → clinical / pharmacy safety
- `pr_*` → pricing
- `loy_*` → loyalty (rules, accounts and ledger)
- `attendance_sessions` → attendance
- `sys_*` → settings
- `audit_*` → audit
- `notifications` → notifications

`reports` is the deliberate read-only cross-domain SQL projection exception. `reconciliation` does not use this exception: it reads other domains only through their public contracts. It may query owned tables for projections but never mutates them. `backup` is the deliberate infrastructure-level whole-instance snapshot/restore exception; restore is encrypted, confirmed, validated and executed atomically.
