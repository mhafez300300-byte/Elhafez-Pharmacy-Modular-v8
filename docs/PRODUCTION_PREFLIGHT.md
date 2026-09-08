# Production Preflight

Clean v8 separates source verification from live-database verification.

## 1. Source/build gate
Run:

```bash
npm run preflight
```

This must pass TypeScript (server + web), architecture boundaries, database ownership, clean-room rules, regression tests and the production build.

## 2. Disposable PostgreSQL drill
Never run the integration drill against production. Create a disposable PostgreSQL database and set only:

```bash
INTEGRATION_DATABASE_URL=postgresql://...
npm run test:postgres
```

The script refuses `NODE_ENV=production` and refuses when `INTEGRATION_DATABASE_URL` equals `DATABASE_URL`. It creates a temporary schema, applies the full migration manifest, proves rollback behavior, constructs the composition root, then drops the schema.

## 3. Runtime readiness
`GET /api/ready` returns success only if PostgreSQL responds and every migration in the application manifest is present. Railway and Docker healthchecks use this endpoint.

## 4. Commercial integrity after deployment
Use the **سلامة العمليات** screen. It checks recent sales and purchases against their required stock, cash/AR/AP and accounting effects. Any mismatch also enters the operational alert center.
