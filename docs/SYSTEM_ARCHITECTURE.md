# Elhafez Pharmacy v8 — System Architecture Constitution

## 1. Architectural style
- Language: TypeScript.
- Deployment style: Modular Monolith.
- Database: PostgreSQL.
- API: Express HTTP API.
- Presentation: existing Web/PWA shell preserved, with business authority on the server.
- Composition rule: only `src/app/composition-root.ts` may wire module implementations together.
- Dependency rule: modules receive explicit typed contracts; no module imports another module's internal files.

## 2. Module map
| Module | Responsibility | Owns / governs |
|---|---|---|
| system | health, bootstrap, provider branding, shell metadata | system state/read bootstrap |
| identity | login, sessions, users, roles, authorization, TOTP | users, sessions, user contexts |
| organization | tenant/branch/cashbox/settings context | tenants, branches, settings, cashboxes |
| catalog | products, drug catalog, price metadata, offers | products, price history/updates, import runs, offers |
| inventory | batches, FEFO availability, stock movements, counts, transfers, serial tracking, provenance | batches, stock moves, counts, transfers, serial items, track events |
| customers | customers and customer-side balances | customers, customer payments |
| suppliers | suppliers and supplier-side balances | suppliers, supplier payments |
| sales | POS, sales, held sales, returns, orders | sales, returns, held sales, orders |
| purchases | purchases, purchase orders, supplier returns | purchases, purchase orders, supplier returns |
| cash | shifts, cash movements, expenses | shifts, cash moves, expenses |
| accounting | journals, chart, periods, statements, posting rules | journal, chart accounts, accounting periods |
| clinical | prescriptions, doctors, safety checks, recalls/controlled dispensing | prescriptions, doctors, clinical rules/controlled dispenses |
| contracts | insurance/contracts/claims | contracts, claims |
| loyalty | loyalty and rewards | loyalty |
| reporting | cross-module read models only | report favorites/read models; no foreign writes |
| reconciliation | integrity checks and safe documented repair orchestration | reconciliation results; no invented financial state |
| transactions | atomic multi-module command orchestration | transaction boundary and idempotency records |
| integrations | outbox/external events | integration outbox |
| backup | backup/restore and printable server documents | backup runs |
| platform | license/update/diagnostics/workers | licenses, diagnostics/system update state |
| compatibility-data | preserves legacy `/api/data` contract by dispatching through ownership policy | owns no business tables |

## 3. Dependency map
Allowed direction:

`Presentation -> HTTP API -> Module Application -> Module Domain -> Module Port/Repository -> PostgreSQL`

Cross-module writes are coordinated only by `transactions` use cases. Cross-module reads are allowed to `reporting` and `reconciliation` as read models. `core` never imports business modules. Business modules may import only `core` and public contracts.

Forbidden:
- module A importing `src/modules/B/application/*` or `infrastructure/*`;
- circular dependencies;
- UI calling PostgreSQL or owning accounting/inventory rules;
- backend importing files from `public/`.

## 4. Database ownership
Business ownership is declared in `src/contracts/store-ownership.ts`. The compatibility data gateway validates that a requested legacy store has a declared owner and blocks generic writes to critical posted stores. Critical posted stores are immutable through generic CRUD and can be changed only through atomic use cases.

Database rules:
- schema changes only through numbered SQL migrations;
- financial/inventory workflows use DB transactions and row locks where required;
- uniqueness, foreign keys, checks and indexes live in PostgreSQL, not only in UI validation;
- no partial financial commit is accepted.

## 5. Core business workflows
### Sale
1. Authenticate and authorize POS action.
2. Validate server-side catalog/pricing/discount rules.
3. Lock sellable batches and allocate FEFO.
4. Build stock ledger + sale document + payment/cash + accounting journal.
5. Validate financial bundle consistency.
6. Commit everything atomically or roll everything back.
7. Return the committed sale to the UI.

### Sale return
Validate original sale and quantities, restore/mark inventory according to inspection, reconcile customer/insurance/loyalty effects, create refund/cash movement and reversing journal, then commit atomically.

### Purchase
Validate supplier invoice and purchase totals, preflight shift/cash if needed, receive batches/provenance, update inventory and supplier balance, create stock and accounting entries, then commit atomically.

### Supplier return
Validate receipt provenance and remaining quantities, update supplier liability/inventory/provenance and journal in one transaction.

### Shift/cash
The server resolves the authoritative current shift. UI-supplied shift identity is never trusted for financial posting.

### Reconciliation
Read cross-module projections and detect missing/partial financial state. Safe repair may rebuild projections or deterministic metadata only; it must never invent money movements.

## 6. Contracts between modules
Public cross-module capabilities are represented as narrow interfaces. Examples:
- authorization contract: `hasPermission`, `requirePermission`;
- inventory availability/provenance contract;
- accounting posting/period-lock contract;
- cash current-shift contract;
- record repository contract scoped to owned stores;
- audit contract;
- event bus contract.

Only the composition root may bind implementations to these contracts.

## 7. Folder structure
```text
src/
  app/
    composition-root.ts
    create-app.ts
    server.ts
  core/
    database/
    errors/
    events/
    http/
    logging/
    money/
    permissions/
    records/
    security/
    validation/
    types/
  contracts/
    store-ownership.ts
    module-contracts.ts
  modules/
    <module>/
      api/
      application/
      domain/
      infrastructure/
      contracts/
      index.ts
  modules/transactions/domain/commercial-invariants.ts
  modules/identity/domain/security-policy.ts
  modules/compatibility-data/infrastructure/projections.ts
  core/database/migrations.ts
public/
  core/
  modules/
  styles/
db/
  migrations/
tests/
```

A module may omit an empty layer; empty folders are not created merely to satisfy a template.

## 8. Design system
`public/styles/app.css` remains the preserved presentation theme source and begins with centralized design tokens. New visual changes must extend tokens/shared UI rather than spreading new repeated hardcoded theme decisions. Authoritative business rules stay outside `public/`.

## 9. Testing strategy
Required gates:
- TypeScript compile check.
- Architecture boundary tests.
- Unit tests for domain calculations and validation.
- Integration tests for atomic commercial workflows.
- API route registration/contract tests.
- database/migration tests where PostgreSQL is available.
- E2E/UAT on a live isolated deployment before using real money/data.
- every fixed bug receives a regression test.

## 10. Change workflow
For every future request: inspect current code, identify owner module and impact, make the smallest correct change, preserve contracts/backward compatibility, run tests/build, and report changed scope and regression coverage.
