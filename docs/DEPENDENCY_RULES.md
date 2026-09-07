# Dependency Rules

1. `src/core/**` imports no file from `src/modules/**`.
2. A module may import `src/core/**`, `src/contracts/**` and its own files only.
3. A module must not import another module's `application`, `domain`, `api` or `infrastructure` implementation.
4. Cross-module use is expressed through public contracts wired in the composition root.
5. `reporting` and `reconciliation` may query cross-module read models, but cannot bypass command ownership for writes.
6. `transactions` is the approved orchestration boundary for multi-module critical commands.
7. Backend code must never import browser files from `public/**`.
8. No direct schema editing outside migrations.
