# Elhafez Pharmacy v8.0.0 — TypeScript Modular Monolith

هذه النسخة إعادة تأسيس هندسي للنسخة النظيفة السابقة، مع الحفاظ على واجهة وتشغيل النظام الحالية قدر الإمكان، لكن بحدود Modules ثابتة وقابلة للتوسع.

## الأساس
- Backend source: TypeScript.
- Architecture: Modular Monolith.
- Database: PostgreSQL + numbered migrations.
- API: Express.
- Composition: `src/app/composition-root.ts` فقط.
- Data ownership: `src/contracts/store-ownership.ts`.
- Module dependency allow-list: `src/app/dependency-manifest.ts`.
- Permanent rules: `ENGINEERING_CONSTITUTION.md`.

## أهم الـModules
Identity, Organization, Catalog, Inventory, Customers, Suppliers, Sales, Purchases, Cash, Accounting, Clinical, Contracts, Loyalty, Reporting, Reconciliation, Transactions, Integrations, Backup, Platform, System, Compatibility Data.

## Build / Test
```bash
npm ci
npm run build
npm run check
npm test
npm start
```

يتطلب التشغيل `DATABASE_URL`. وفي Production يجب أن يكون `APP_SECRET` بطول 32 حرفًا على الأقل.

## Docker / Railway
`Dockerfile` يعمل Multi-stage: يثبت dev dependencies في مرحلة البناء، يشغّل TypeScript build، ثم ينقل `dist` فقط إلى Runtime مع production dependencies و`public` و`db`.

## قاعدة مهمة للواجهة
ملفات `public/` الحالية محفوظة كـPresentation Runtime للحفاظ على نفس الشكل والسلوك، لكنها ليست مصدر Business Logic للBackend. أي منطق مالي/مخزني authoritative مكانه Module/Use Case على السيرفر. عند تطوير واجهة جديدة، تستخدم نفس API Contracts ولا تنقل القواعد التجارية إلى Components.

## الوثائق
- `ARCHITECTURE.md`
- `docs/MODULE_MAP.md`
- `docs/DEPENDENCY_RULES.md`
- `docs/DATABASE_OWNERSHIP.md`
- `docs/CORE_WORKFLOWS.md`
- `docs/CONTRACTS.md`
- `docs/FOLDER_STRUCTURE.md`
- `docs/TESTING_STRATEGY.md`
- `ENGINEERING_CONSTITUTION.md`
- `PARITY_REPORT.md`

## قبل التشغيل التجاري
نجاح Build/Regression ليس بديلًا عن UAT حي. يجب نشر النسخة على PostgreSQL مع بيانات اختبار معزولة وتنفيذ دورة البيع/المرتجع/المشتريات/الوردية/الحسابات/Reconciliation قبل إدخال بيانات أو أموال حقيقية.
