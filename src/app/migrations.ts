import type { Migration } from '../core/db/migrator.js';
import { organizationMigrations } from '../modules/organization/infrastructure/migrations.js';
import { identityMigrations } from '../modules/identity/infrastructure/migrations.js';
import { auditMigrations } from '../modules/audit/infrastructure/migrations.js';
import { catalogMigrations } from '../modules/catalog/infrastructure/migrations.js';
import { customerMigrations } from '../modules/customers/infrastructure/migrations.js';
import { supplierMigrations } from '../modules/suppliers/infrastructure/migrations.js';
import { settingsMigrations } from '../modules/settings/infrastructure/migrations.js';
import { platformMigrations } from '../modules/platform/infrastructure/migrations.js';
import { inventoryMigrations } from '../modules/inventory/infrastructure/migrations.js';
import { cashMigrations } from '../modules/cash/infrastructure/migrations.js';
import { accountingMigrations } from '../modules/accounting/infrastructure/migrations.js';
import { salesMigrations } from '../modules/sales/infrastructure/migrations.js';
import { purchaseMigrations } from '../modules/purchases/infrastructure/migrations.js';
import { notificationMigrations } from '../modules/notifications/infrastructure/migrations.js';
import { settlementMigrations } from '../modules/settlements/infrastructure/migrations.js';
import { expenseMigrations } from '../modules/expenses/infrastructure/migrations.js';
import { clinicalMigrations } from '../modules/clinical/infrastructure/migrations.js';
import { pricingMigrations } from '../modules/pricing/infrastructure/migrations.js';
import { loyaltyMigrations } from '../modules/loyalty/infrastructure/migrations.js';
import { attendanceMigrations } from '../modules/attendance/infrastructure/migrations.js';
import { drugMasterMigrations } from '../modules/drugmaster/infrastructure/migrations.js';
import { idempotencyMigrations } from '../modules/idempotency/infrastructure/migrations.js';

export const migrations: readonly Migration[] = [
  ...organizationMigrations,
  ...identityMigrations,
  ...auditMigrations,
  ...catalogMigrations,
  ...customerMigrations,
  ...supplierMigrations,
  ...settingsMigrations,
  ...platformMigrations,
  ...inventoryMigrations,
  ...cashMigrations,
  ...accountingMigrations,
  ...salesMigrations,
  ...purchaseMigrations,
  ...notificationMigrations,
  ...settlementMigrations,
  ...expenseMigrations,
  ...clinicalMigrations,
  ...pricingMigrations,
  ...loyaltyMigrations,
  ...attendanceMigrations,
  ...drugMasterMigrations,
  ...idempotencyMigrations,
];
