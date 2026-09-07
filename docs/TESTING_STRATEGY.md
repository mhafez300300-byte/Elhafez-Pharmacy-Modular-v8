# Testing Strategy

## Required layers
- TypeScript build/type validation.
- Architecture boundary tests.
- Unit tests for money, pricing, validation, FEFO and accounting-period rules.
- Commercial invariant tests for atomic sale/purchase/return/cash bundles.
- API registration/contract tests for all routes.
- Database/migration tests when PostgreSQL is available.
- E2E/UAT against an isolated live deployment before production use.

## Regression rule
Every fixed defect must leave a regression test at the lowest useful layer. Financial corruption bugs require an invariant/integration regression, not only a UI test.

## Current local gate
`npm run build` → `node scripts/check-modules.js` → `node --test tests/*.test.js`.
