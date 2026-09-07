# Module Contracts

- `src/contracts/module-contracts.ts`: reusable public capability contracts.
- `src/contracts/store-ownership.ts`: data ownership contract.
- `src/modules/*/contracts/dependencies.ts`: explicit dependency surface for each route/service factory.
- `src/app/dependency-manifest.ts`: composition allow-list; the composition root passes only declared dependencies.

Rules:
1. Module implementation does not import another Module implementation.
2. A capability needed by another Module is exposed as a narrow contract and wired in `composition-root.ts`.
3. Contract changes require consumer analysis and regression tests.
4. Generic `ctx:any` module factories are forbidden by architecture tests.
