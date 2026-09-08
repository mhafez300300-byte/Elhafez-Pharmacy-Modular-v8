# v8.7.0 UAT remediation

This build treats the v8.4 commercial UAT as a release gate. It is rebuilt from the clean v8 line, not from the rejected v8.4.1 patch build.

## Closed in source/build
- UAT-001/002/003: safe DOM/modal form lifecycle; arbitrary readonly DOM properties are not assigned; create dialogs use real forms and guarded submit.
- UAT-004/005: chained audit repository + transactional shift open/close audit.
- UAT-006: dashboard integrity warning overrides the normal “stable” message.
- UAT-009: blind close no longer shows expected cash before actual count.
- UAT-012: shortage write path is idempotent and UI submit guards remain enabled.
- UAT-013/021: empty POS sale returns explicit feedback; total wording is final/current rather than “approximate”.
- UAT-014: an empty central drug catalog is now explicitly shown as NOT LOADED, not as a complete feature.
- UAT-015/016/023/024: sidebar overflow containment, focus-visible, skip link, and 44px mobile controls.
- UAT-017/022: technical backup secret removed from customer UI; audit presentation hides raw technical identifiers by default.
- UAT-019: reports now include date filters, loading state, last-updated state and CSV export for the filtered sales view.
- UAT-010/011: loading feedback and last-updated timing were added to expensive decision pages; the earlier fixed 500-product planning cap is removed. Production latency still requires remeasurement after deployment.

## Existing transactional safeguards revalidated
- FEFO earliest-expiry allocation and oversell rejection.
- Sale orchestration: inventory + invoice + cash + journal + audit.
- Supplier return: exact batch + payable/cash + journal + audit.
- Reconciliation detects missing stock/financial side effects.
- Track & Trace sale/batch idempotency.
- Insurance claim calculation/workflow.
- Backup encryption, verify and tenant-safe restore confirmation.

## Must be proven on live Production UAT (not honestly provable by local build)
- Actual cold-load and Reorder latency budgets.
- Product → Supplier → Purchase → Receiving → two batches → FEFO sale → partial return → cash → accounting → audit → reconciliation → reports.
- Real barcode scanner/printer/PDF/WhatsApp hardware/browser behavior.
- Real central drug catalog source, licensing, version and sync quality.
- Full role-by-role navigation and mobile viewport acceptance.

Preflight: typecheck + architecture + DB ownership + clean-room + 58 tests + server/web build.
