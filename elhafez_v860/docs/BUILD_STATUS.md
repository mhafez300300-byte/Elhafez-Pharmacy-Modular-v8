# Clean v8 Build Status

This repository is a clean-room rewrite. The old pharmacy system is a requirements and business-data reference only. Legacy browser code, CSS, routes, storage bridges and database implementation are not copied into Clean v8.

## Completed clean slices
- TypeScript Modular Monolith foundation with architecture and database-ownership enforcement.
- Organization, identity/RBAC, settings, Owner Center activation port/adapter.
- Persistent revocable sessions, session/device management, PIN change with session revocation, and database-backed five-attempt login lockout.
- Security headers, same-origin browser write guard, bounded request bodies and production HSTS.
- Products, customers, suppliers and customer credit-limit enforcement with permissioned/audited override reason.
- Inventory batches, expiry, FEFO, counts, transfers and return classifications.
- Sales/POS, sale returns, invoice-level discount allocation, loyalty redemption/earning/reversal and idempotent double-submit protection.
- Purchase orders, partial receiving, purchase receipts and supplier returns.
- Cash shifts and expected-vs-actual reconciliation.
- AR/AP settlement allocation and expenses.
- Clinical prescriptions, recalls and server-enforced safety checks.
- Offers and controlled price updates.
- Attendance.
- Encrypted whole-instance backup/restore plus non-destructive verify/preview before restore and tenant/required-table checks.
- Replenishment / Push List intelligence.
- Customer 360 and Supplier 360.
- Professional operational reports.
- Full accounting chart foundation, trial balance, income statement, balance sheet and accounting period close/reopen controls.
- Audit SHA-256 hash chain with integrity verification.
- Central medicine master with search by name / ingredient / manufacturer / barcode / GTIN and packaged 25,065-row reference dataset.
- Clean document module for sales/purchase printable documents plus Excel-compatible SpreadsheetML export.
- Operational alert center with deduplication/resolution for stock, expiry, stale shifts, cash variances, aged AR/AP and integrity failures.
- Background workers for alerts and cleanup; worker intervals are configuration values, not UI/runtime patches.
- Reconciliation module that checks every scanned sale/purchase against its inventory, cash/settlement and accounting side effects using public module contracts only.
- Performance indexes for FEFO, sales, purchases, settlements, cash and catalog hot paths.
- `/api/ready` verifies PostgreSQL and the exact migration manifest before declaring an instance ready.
- Railway and Docker healthchecks target `/api/ready`.
- Disposable PostgreSQL integration-drill command is included (`npm run test:postgres`) and refuses production/same-URL use.

## Current verification gate
Run `npm run preflight` before any deployment. It covers server/web TypeScript, module dependency rules, database table ownership, clean-room scanning, regression tests and production build.

Latest verified gate:
- Architecture PASS — 137 module source files.
- Database ownership PASS — 157 owned-table mutations inspected.
- Clean-room PASS — no legacy v7 runtime markers / legacy UI filenames.
- Regression tests PASS — 41/41.
- Production build PASS.

## Still required before commercial release
- Native server-generated Arabic PDF binary and direct WhatsApp PDF file sharing (current clean print route supports browser Save as PDF).
- Execute the included PostgreSQL integration drill against a disposable real PostgreSQL database and then expand it into full API end-to-end coverage.
- Performance profiling with realistic commercial data, including the 25k medicine master and concurrent POS activity.
- Full restore drill on a disposable production-like database.
- Mobile/Android shell after web UAT.
- Full commercial UAT and regression on a clean deployed environment. The system must not be called ready for sale until these gates pass.
