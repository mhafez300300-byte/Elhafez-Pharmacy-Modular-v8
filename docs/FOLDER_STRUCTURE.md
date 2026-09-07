# Folder Structure

```text
src/
  app/                         # composition/bootstrap only
  core/                        # generic infrastructure/primitives only
    database/
    errors/
    events/
    logging/
    money/
    runtime/
    types/
  contracts/                   # system-wide public contracts/ownership
  modules/
    <business-module>/
      api/                     # HTTP adapters
      application/             # use cases/services
      domain/                  # module business rules when needed
      infrastructure/          # module-owned persistence/read models when needed
      contracts/               # explicit dependency/public boundary
      index.ts                 # module descriptor/ownership metadata
public/                        # preserved presentation runtime; no authoritative business rules
  core/
  modules/
  styles/
db/
  schema.sql
  migrations/
tests/
scripts/
docs/
```

Empty layers are not created merely to satisfy a template. A layer appears when the module actually needs it.
