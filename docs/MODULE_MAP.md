# Module Map and Responsibility Boundaries

This file is the operational index for finding where a future change belongs.

- **identity**: authentication, sessions, users/roles, permissions, credential security.
- **organization**: tenant context, branches, settings, cashboxes.
- **catalog**: product master, catalog import/search, offers and price metadata.
- **inventory**: stock availability, batches, FEFO, provenance, transfers/counts/tracking.
- **customers**: customer master and customer receivable/payment data.
- **suppliers**: supplier master and supplier payable/payment data.
- **sales**: POS, sale documents, returns, held sales and order fulfillment.
- **purchases**: purchase receiving, purchase orders and supplier returns.
- **cash**: shifts, cash movements and expenses.
- **accounting**: journals, accounts, periods, statements and accounting controls.
- **clinical**: clinical checks, drug catalog clinical rules, prescriptions/doctors.
- **contracts**: contracts/insurance and claims.
- **loyalty**: points and rewards.
- **reporting**: cross-module read models; never authoritative writes into other modules.
- **reconciliation**: integrity inspection and safe deterministic repair orchestration.
- **transactions**: atomic multi-module commands and idempotency.
- **integrations**: external integration status/outbox/events.
- **backup**: backups, restore and printable server document generation.
- **platform**: licensing, app update and diagnostics/background platform workers.
- **system**: health/bootstrap/branding endpoints.
- **compatibility-data**: backward-compatible generic API facade governed by store ownership.
