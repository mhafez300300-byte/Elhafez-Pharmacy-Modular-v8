# Elhafez Pharmacy v8.0.0 — Architecture & Parity Report

## Result
**SOURCE/ARCHITECTURE GATE: PASS**

This report compares v8.0.0 against the clean v7.1.0 reference that preserved the commercial/API behavior of v7.0.45.

## Architecture verification
- Backend/application/domain source is TypeScript.
- 85 TypeScript source files under `src/`.
- 21 explicit business/system modules.
- `src/app/composition-root.ts`: 90 lines.
- No legacy root `server.js`.
- No JavaScript backend source remains under `src/`.
- No `@ts-nocheck` in TypeScript source.
- Module route/service factories use explicit dependency contracts; open `ctx:any` service-locator factories are blocked by tests/checks.
- Core imports no business module.
- Business modules import no other module implementation internals.
- Backend imports no presentation files from `public/`.
- Database DDL remains migration-owned.
- 42/42 compatibility stores have declared business ownership.

## Capability ownership corrections
- Shift lifecycle and expense financial preparation: **Cash**.
- Purchase receipt provenance consume/restore: **Inventory**.
- Clinical allergy/interaction alert engine: **Clinical**.
- Commercial atomic invariants: **Transactions/domain**.
- Security policy: **Identity/domain**.
- Generic record projections: **Compatibility Data/infrastructure**.
- Migration runner: **Core/database**.

## API parity
- Reference API routes: 80.
- v8 API routes: 80.
- Missing routes: 0.
- Extra routes: 0.
- Method + path set: exact match.

## Presentation / database parity
- `public/`: byte/file diff against v7.1.0 = no differences.
- `db/`: byte/file diff against v7.1.0 = no differences.
- Existing Web/PWA presentation remains preserved to avoid visual/behavioral drift.
- Authoritative finance/inventory/security logic no longer depends on browser files.

## Build / checks
- `npm run typecheck`: PASS.
- `npm run check`: PASS.
- TypeScript compiler pinned: 5.8.3.
- Express pinned: 5.1.0.
- pg pinned: 8.16.3.
- `package-lock.json` dependency graph synchronization check (`npm ci --package-lock-only --offline`): PASS.

## Regression tests
**47/47 PASS**.

Coverage includes architecture boundaries, dependency contracts, module capability ownership, atomic/idempotent financial requests, FEFO locking/allocation rules, server-side sale numbering, purchase cash preflight, authoritative current shift, reconciliation integrity, safe repair restrictions, committed sale bridge, projection cleanup, sale total tampering, discounts, split/insurance payments, accounting periods, commercial bundles, catalog pricing, loyalty/contracts, and route registration.

## Environment limitations / not claimed
- A live PostgreSQL UAT was not executed in this local build environment.
- Docker itself is not installed in this environment, so the Docker image was not locally executed here.
- The local environment could not reach npm registry DNS; TypeScript compilation used the installed 5.8.3 compiler. The lockfile is synchronized and the Dockerfile uses normal `npm ci` in the deployment environment.

Therefore v8.0.0 is accepted as a **clean source/architecture rebuild**, but it must still pass isolated live PostgreSQL/Railway UAT before real pharmacy money/data is used.
