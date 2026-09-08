# Elhafez Pharmacy v8.8.0 — UAT acceptance remediation

This release is a clean remediation candidate based on the full FAST COMMERCIAL UAT report. It does not claim live-production PASS for items that require Railway/browser/hardware/external drug data.

## UAT defects 001–024
- UAT-001/002/003 — CLOSED IN CODE: modal/form infrastructure uses real forms, guarded submit and safe DOM property handling; master-data dialogs no longer use readonly DOM property assignment.
- UAT-004 — CLOSED IN CODE / LIVE VERIFY: chained audit verification distinguishes legacy/unsealed data from an actual broken chain; integrity is surfaced to health UI.
- UAT-005 — CLOSED IN CODE: shift open/close audit events are transactional; regression test included.
- UAT-006 — CLOSED IN CODE: dashboard health cannot show stable when audit/reconciliation health is critical.
- UAT-007 — CLOSED IN DOMAIN TESTS / LIVE E2E VERIFY: FEFO earliest-expiry allocation + oversell rejection covered; live two-batch sale/return remains release-gate UAT.
- UAT-008 — CLOSED IN ORCHESTRATION TESTS / LIVE E2E VERIFY: purchase/supplier-return and sale atomic side effects are covered; live purchase-receiving cycle remains release-gate UAT.
- UAT-009 — CLOSED IN CODE: blind close hides expected cash until actual is submitted.
- UAT-010 — REMEDIATED / LIVE MEASURE: replenishment removed fixed 500-product planning cap, exposes loading/last-updated state; production query latency must be measured.
- UAT-011 — REMEDIATED / LIVE MEASURE: page modules are now lazy-loaded with dynamic imports instead of eagerly loading every page at startup; production cold-load must be remeasured.
- UAT-012 — CLOSED IN CODE: shortage creation is idempotent and submit guarded.
- UAT-013 — CLOSED IN UI: empty POS sale gives explicit feedback / disabled reason path.
- UAT-014 — EXTERNAL DATA REQUIRED: empty central catalog is explicitly shown as NOT LOADED; a licensed/authoritative drug catalog cannot be fabricated in source code.
- UAT-015/016 — CLOSED IN CSS/UI: sidebar overflow containment, accordion behavior and mobile handling.
- UAT-017 — CLOSED IN CUSTOMER UI: accounting account types/reference labels are Arabic; raw technical IDs are hidden from normal accounting presentation.
- UAT-018 — DATA QUALITY / LIVE VERIFY: UI uses Unicode Arabic; existing malformed user data must be corrected at source and verified live.
- UAT-019 — IMPROVED: reports have date filters, loading state, last-updated, spreadsheet-compatible CSV export and print/PDF path; live document drilldown remains UAT verification.
- UAT-020 — CLOSED IN UX: insurance plan shows a live coverage example before save; one source of truth remains the saved plan/settings calculation.
- UAT-021 — CLOSED IN UI: POS uses current/final total wording, not “approximate total”.
- UAT-022 — CLOSED IN UI: BACKUP_SECRET is not exposed to the customer UI.
- UAT-023/024 — CLOSED IN UI/CSS: skip-to-content, focus-visible and 44px mobile targets.

## Broader report remediation
- Role-aware navigation uses permissions so operational roles do not receive every administrative page.
- Accounting UI translates technical account/reference types to commercial Arabic labels.
- Reports gained date filtering, refresh/loading feedback, spreadsheet export and print/PDF workflow.
- Insurance plan editor gained live patient/provider share preview.
- Intelligence/replenishment keep business calculations inside their domain/read-model modules rather than moving logic into UI.
- Backup remains encrypted and restore requires tenant match + explicit confirmation; tests cover tamper rejection and verify drill.
- Version is synchronized to v8.8.0 in package and visible shell.

## Non-negotiable live release gate
Before calling this sellable, Work must prove on deployed production:
1. Create Product + Customer + Supplier with no modal/runtime error.
2. Purchase Order → approval → receiving → two batches.
3. FEFO sale consumes earliest batch then spans batches.
4. Partial sale return restores original allocation correctly.
5. Cash shift + cash movement + supplier/customer balances.
6. Balanced accounting journal for sale/purchase/return.
7. Audit chain includes shift and commercial events.
8. Reconciliation agrees with invoice/stock/cash/journal/audit.
9. Reports/dashboard reflect the same UAT documents.
10. Cold load and Reorder latency are remeasured on Railway.
11. Mobile/sidebar/role navigation verified in real viewport.
12. Printer/barcode/PDF/WhatsApp behavior verified with real browser/hardware.

## Local preflight
- TypeScript: PASS
- Architecture boundaries: PASS (170 module source files)
- Database ownership: PASS (179 owned-table mutations)
- Clean-room: PASS
- Automated tests: 58/58 PASS
- Server + Web build: PASS
