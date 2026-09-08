# Elhafez Pharmacy v8.4.0 — UAT remediation verification

Basis: FAST COMMERCIAL UAT dated 2026-09-08. Status here distinguishes code/test verification from live-production verification.

| ID | Result | Remediation / verification |
|---|---|---|
| UAT-001 | PASS (code + automated) | Removed unsafe generic DOM property assignment; arbitrary attributes such as `form` are now set as attributes, with a small allow-list for writable properties. Added regression test. |
| UAT-002 | PASS (code path) | Product modal uses the corrected shared modal/DOM helper. Full browser+Postgres creation still requires deployed UAT. |
| UAT-003 | PASS (code path) | Supplier modal uses the corrected shared modal/DOM helper. Purchase orchestration tests already cover approval/receiving/returns. Live E2E still required. |
| UAT-004 | PASS (code + automated) | Audit verifier now treats pre-integrity legacy unhashed rows as a legacy prefix rather than a false break at event 1, while still rejecting unhashed gaps after signed events. Added regression test. |
| UAT-005 | PASS (automated) | Shift open/close are written to Audit inside the same transaction; cash-audit test passes. |
| UAT-006 | PASS (code review) | Dashboard health consumes `/api/audit/verify` and reconciliation and shows a critical clickable warning when either fails. |
| UAT-007 | PASS (automated) | FEFO earliest-batch allocation, oversell rejection, and sequential partial return to original batches pass tests. Live two-batch UAT remains required. |
| UAT-008 | PASS (automated core) | Purchase approval, receiving guard, exact allocation, supplier return accounting/audit atomicity pass tests. Live Postgres E2E remains required. |
| UAT-009 | PASS (code review) | Open shift screen explicitly withholds expected cash until actual count is submitted; expected is only shown in closed-shift history. |
| UAT-010 | NOT LIVE-VERIFIED | Replenishment service parallelizes product/balance/7d/30d reads and web page lazy-loads, but production 9.2s target must be remeasured after deployment. |
| UAT-011 | NOT LIVE-VERIFIED | Pages are lazy imported and a loading shell is rendered; production cold-load budget must be remeasured after deployment. |
| UAT-012 | PASS (code + automated) | Server rejects recent duplicate shortages; POS button now locks during request; modal save also locks. |
| UAT-013 | PASS (code review) | Empty POS submit is disabled with reason and also guarded by an Arabic error toast. |
| UAT-014 | PARTIAL | Egypt drug reference CSV and drug-master normalization tests exist. Production catalog population/sync must be verified after deployment. |
| UAT-015 | PASS (code review) | Sidebar has `overflow-x:hidden`; nav/touch controls have >=44px target rules. |
| UAT-016 | PASS (code review) | Auto sidebar expansion pushes main content from 72px to 246px rather than covering it. |
| UAT-017 | PARTIAL | Main navigation/business labels are Arabic; some advanced technical concepts remain intentionally visible in specialist screens. Full copy audit not live-verified. |
| UAT-018 | NOT DATA-VERIFIED | No safe code-only fix can prove/correct a specific corrupted production username without the production row. |
| UAT-019 | PARTIAL | Reports use real data and role-gated profit/cost, but requested complete filters/export/drilldown matrix is not fully implemented/verified. |
| UAT-020 | PARTIAL | Insurance calculation has automated coverage/status tests; full production wording + claim workflow needs live UAT. |
| UAT-021 | PASS (code review) | POS displays `الإجمالي النهائي قبل الاعتماد` with tax/manual discount/loyalty breakdown. |
| UAT-022 | PASS (code review) | BACKUP_SECRET is not exposed by web/public UI; it remains server environment configuration only. |
| UAT-023 | PASS (code review) | Skip-to-content link and focus-visible rules are present. |
| UAT-024 | PASS (code review) | Navigation/buttons/form controls enforce practical 44px minimum targets. |

## Regression gate executed
- `npm run check`: PASS — typecheck, architecture, DB ownership, clean-room, 64 automated tests.
- `npm run preflight`: PASS — full check + server/web build.
- `npm run test:performance`: NOT VERIFIED in this sandbox because runtime dependency installation (`pg`) could not be completed within the execution environment timeout; no performance PASS is claimed.

## Mandatory live re-test before calling the release commercially ready
Deploy to an isolated UAT database and execute Product → Supplier → PO → Approval → Receiving → two Batches → FEFO Sale crossing batches → Partial Return → Cash/Credit → Journal → Reports → Audit/Reconciliation. Re-measure Cold Load, Reorder, Quick Navigation and shift UI refresh. Verify central drug catalog population, corrupted username data, reports export/drilldown, insurance end-to-end, Track & Trace end-to-end and mobile responsive behavior on a real device.
