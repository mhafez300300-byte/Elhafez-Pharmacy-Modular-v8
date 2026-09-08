# Elhafez Pharmacy v8 — Engineering Constitution

This document is binding for the clean rebuild and future changes.

## 1. Architecture
- TypeScript backend and TypeScript browser source.
- Modular Monolith organized by business domain.
- A module owns its domain rules, application services, persistence, HTTP adapter and migration.
- Modules never import another module's implementation. Cross-module calls use the target module's `contracts` only.
- Composition happens only in `src/app/composition-root.ts`.
- Circular dependencies are forbidden.

## 2. Separation
- UI renders state and invokes APIs. It never owns authoritative stock, accounting, tax, permission or financial rules.
- Domain code has no Express or PostgreSQL imports.
- Application services orchestrate use cases through contracts.
- Infrastructure implements contracts and is replaceable.

## 3. Data ownership
- Each table prefix declares its owner: `org_`, `id_`, `cat_`, `inv_`, `sales_`, `purchase_`, `cash_`, `acc_`, `crm_`, `sys_`, `audit_`, `platform_`.
- DDL is introduced only through module migrations.
- Direct writes to another module's tables are forbidden.

## 4. Atomicity
- A posted sale is one database transaction: invoice + FEFO issue + cash movement when applicable + accounting journal + audit.
- A purchase receipt is one transaction: receipt + batch receipt + cash/AP journal + audit.
- A return is one transaction: return document + stock classification + refund/receivable adjustment + reversing journal + audit.
- Any failure rolls back the whole use case.

## 5. Clean-room rule
The previous pharmacy application is a business reference only. Its browser files, routes, CSS, storage bridge, database records model, and compatibility layer are not source material for v8.

## 6. Change safety
- No patch files or duplicate helpers.
- Search for existing capabilities before adding new ones.
- A business rule must have a regression test.
- `npm run check` must pass before deployment.
