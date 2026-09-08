# Elhafez Pharmacy v8 — Clean Rebuild

A clean-room TypeScript Modular Monolith for pharmacy ERP/POS. The previous pharmacy product is used only as a business-capability reference; its runtime/UI/schema are not copied.

## Commands
```bash
npm run preflight
# against a disposable PostgreSQL database only:
# INTEGRATION_DATABASE_URL=postgresql://... npm run test:postgres
npm start
```

## Architecture gates
- `npm run check:architecture` blocks cross-module implementation imports.
- `npm run check:clean-room` blocks legacy runtime/UI markers.
- `npm run check:db-ownership` blocks writes to another module's tables.
- Domain/orchestration/security/reconciliation regressions run with Node's test runner.
- `/api/ready` verifies PostgreSQL plus the applied migration manifest.

See `docs/ENGINEERING_CONSTITUTION.md`, `docs/MODULE_MAP.md`, `docs/DATABASE_OWNERSHIP.md`, `docs/REFERENCE_CAPABILITY_MATRIX.md`, `docs/BUILD_STATUS.md`, and `docs/PRODUCTION_PREFLIGHT.md`.

This snapshot is under active construction and is not yet declared commercially ready.


## Current clean-build status

See `docs/BUILD_STATUS.md`.


## Current clean-rebuild guarantees
- Legacy v7 runtime/UI code is forbidden by a clean-room scanner.
- Cross-module implementation imports are forbidden; only public contracts may cross boundaries.
- Database writes are checked against module table ownership.
- Sales commands support idempotency to prevent duplicate invoices on retries/double-submit.
- Loyalty redemption/earning and return reversal run inside the same database transaction as the sale.

## Batch 4 hardening
Persistent sessions, login lockout, audit hash-chain verification, recovery preview, operational alerts, commercial reconciliation, performance indexes, credit-limit enforcement and deployment readiness checks are implemented without importing another module's internals.
