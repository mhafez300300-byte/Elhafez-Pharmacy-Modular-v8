# Module Map

| Module | Owns | Public responsibilities |
|---|---|---|
| organization | `org_*` | tenant and branch identity |
| identity | `id_users`, `id_sessions`, `id_login_attempts` | users, login, RBAC, revocable sessions and login protection |
| onboarding | no tables | first-time setup orchestration |
| platform | `platform_*` | Owner Center activation port/adapter |
| idempotency | `idem_*` | replay protection for atomic commands |
| catalog | `cat_*` | products, barcode, prices, tax and Rx flags |
| drugmaster | `drug_master` | central medicine reference catalog |
| customers | `crm_customers` | customer master data and credit limit |
| suppliers | `crm_suppliers` | supplier master data |
| inventory | `inv_*` | FEFO, batches, expiry, counts, transfers and return holds |
| cash | `cash_*` | shifts, cash movement and reconciliation |
| accounting | `acc_*` | double-entry journal, chart, statements and periods |
| sales | `sales_*` | invoices, returns and demand summary contract |
| purchases | `purchase_*` | purchase orders, receipts and supplier returns |
| settlements | `fin_*` | AR/AP obligations, allocation, collection and payment |
| expenses | `exp_*` | operating expenses |
| clinical | `ph_*` | doctors, prescriptions, recalls and interaction rules |
| pricing | `pr_*` | offers and controlled price updates |
| loyalty | `loy_*` | earning/redemption rules, points accounts and immutable ledger |
| attendance | `attendance_*` | employee self check-in/out and history |
| notifications | `notifications` | deduplicated operational alerts and user read state |
| audit | `audit_*` | audit events, chain head and tamper verification |
| settings | `sys_*` | pharmacy presentation/settings data |
| insurance | `ins_*` | insurance providers, plans, sale-linked claims and claim workflow |
| tracktrace | `trace_*` | batch/GTIN/serial trace events and automated FEFO dispense trace |
| automation | no tables | policy-aware automation snapshot through public contracts |
| backup | no tables | encrypted whole-instance backup/restore infrastructure |
| replenishment | no tables | reorder intelligence via Catalog/Inventory/Sales contracts |
| party360 | no tables | Customer 360 / Supplier 360 using domain contracts only |
| documents | no tables | printable/exportable document projections via contracts |
| alerts | no tables | operational alert orchestration via reports/cash/settlements/reconciliation contracts |
| reconciliation | no tables | cross-domain commercial integrity checks through contracts only |
| reports | no tables | deliberate read-only cross-domain reporting projections |

Cross-module implementation imports are forbidden. Application flows can import only another module's `contracts/`. Composition happens in `src/app/composition-root.ts` and is enforced by `scripts/check-architecture.mjs`.
