# v7 Reference Capability Matrix

The previous application is inspected only to identify business capabilities, workflows and reference medicine data. No browser code, CSS, routes, compatibility layer, storage bridge or database implementation is copied into Clean v8.

| Reference capability | Clean v8 status |
|---|---|
| Product catalog / barcode / pricing | Implemented cleanly |
| Customers / suppliers | Implemented cleanly |
| Branch context and branch creation | Implemented cleanly |
| Users / granular RBAC / discount limits | Implemented cleanly |
| Batches + expiry + FEFO | Implemented cleanly |
| Prevent overselling | Implemented with domain rule + regression test |
| Inventory count / branch transfers | Implemented cleanly |
| Purchase orders + partial receiving | Implemented cleanly |
| Purchase receiving into exact batches | Implemented cleanly |
| Supplier returns | Implemented cleanly and atomic |
| POS sale | Implemented cleanly |
| Atomic stock + sale + cash + journal + audit | Implemented cleanly |
| Sale return classification | Implemented cleanly |
| Cash shifts and expected-vs-actual reconciliation | Implemented cleanly |
| Double-entry journal | Implemented cleanly |
| Chart of accounts + trial balance | Implemented cleanly |
| Income statement + balance sheet | Implemented cleanly |
| Period close / reopen controls | Implemented cleanly; posting into a closed period is blocked |
| AR/AP obligations and payment allocation | Implemented cleanly |
| Expenses | Implemented cleanly |
| Customer 360 / Supplier 360 | Implemented cleanly through contracts |
| Drug recalls / prescriptions / safety checks | Implemented cleanly |
| Rx-required products | Implemented cleanly |
| Offers / price update center | Implemented cleanly |
| Loyalty | Implemented configurable earning/redemption rules, POS redemption and proportional return reversal |
| Push List / reorder intelligence | Implemented cleanly with 7/30-day demand, coverage and reorder level |
| Attendance | Implemented cleanly |
| Encrypted backup / restore | Implemented cleanly; central master data is re-seedable and excluded from tenant backup |
| Professional reports | Implemented current set: sales, stock health, supplier performance, party balances, return analysis |
| Owner Center activation adapter | Implemented clean port/adapter |
| Central drug master catalog | Implemented cleanly |
| 25,065 medicine reference records | Packaged as clean reference data and auto-seeded into empty master catalog |
| Search by ingredient/manufacturer/barcode/GTIN | Implemented cleanly |
| Adopt reference drug into pharmacy catalog | Implemented cleanly |
| Printable sales/purchase documents | Implemented cleanly |
| Excel export | Implemented as Excel-compatible SpreadsheetML |
| Browser Save as PDF | Implemented through clean printable document route |
| Native PDF binary + direct WhatsApp PDF sharing | Pending |
| Android shell | After web commercial UAT |
| Production migration/import from old customer data | Only after Clean v8 schema is stable |
| Persistent sessions / login lockout / device revocation | Implemented cleanly |
| Audit tamper verification | Implemented SHA-256 chain + verification |
| Operational alerts | Implemented with deduplication and automatic refresh worker |
| Cross-domain commercial reconciliation | Implemented via contracts; mismatches create critical alerts |
| Backup verify before restore | Implemented non-destructively |
| Deployment readiness / migration health | Implemented via `/api/ready` + Railway/Docker healthcheck |
| Disposable PostgreSQL integration drill tooling | Implemented; live execution still required before sale |
| Full live PostgreSQL UAT and commercial regression | Required before sale |

Nothing in the “Pending” or “Required before sale” rows is represented as completed.
