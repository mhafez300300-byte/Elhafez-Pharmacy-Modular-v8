import type { AppConfig } from '../core/config/env.js';
import type { PostgresDatabase } from '../core/db/postgres.js';
import { PostgresOrganizationRepository } from '../modules/organization/infrastructure/postgres-organization.js';
import { PostgresIdentityRepository } from '../modules/identity/infrastructure/postgres-identity.js';
import { AuthService } from '../modules/identity/application/auth-service.js';
import { PostgresAuditRepository } from '../modules/audit/infrastructure/postgres-audit.js';
import { PostgresCatalogRepository } from '../modules/catalog/infrastructure/postgres-catalog.js';
import { CatalogService } from '../modules/catalog/application/catalog-service.js';
import { PostgresCustomerRepository } from '../modules/customers/infrastructure/postgres-customers.js';
import { PostgresSupplierRepository } from '../modules/suppliers/infrastructure/postgres-suppliers.js';
import { PostgresSettingsRepository } from '../modules/settings/infrastructure/postgres-settings.js';
import { PostgresInventoryRepository } from '../modules/inventory/infrastructure/postgres-inventory.js';
import { InventoryService } from '../modules/inventory/application/inventory-service.js';
import { PostgresCashRepository } from '../modules/cash/infrastructure/postgres-cash.js';
import { CashService } from '../modules/cash/application/cash-service.js';
import { PostgresAccountingRepository } from '../modules/accounting/infrastructure/postgres-accounting.js';
import { PostgresSalesRepository } from '../modules/sales/infrastructure/postgres-sales.js';
import { SalesService } from '../modules/sales/application/sales-service.js';
import { PostgresPurchaseRepository } from '../modules/purchases/infrastructure/postgres-purchases.js';
import { PurchaseService } from '../modules/purchases/application/purchase-service.js';
import { PostgresReportRepository } from '../modules/reports/infrastructure/postgres-reports.js';
import { PostgresNotificationRepository } from '../modules/notifications/infrastructure/postgres-notifications.js';
import { OwnerCenterActivationAdapter } from '../modules/platform/infrastructure/owner-center-activation.js';
import { PostgresPlatformRepository } from '../modules/platform/infrastructure/postgres-platform.js';
import { SetupService } from '../modules/onboarding/application/setup-service.js';
import { PostgresSettlementRepository } from '../modules/settlements/infrastructure/postgres-settlements.js';
import { SettlementService } from '../modules/settlements/application/settlement-service.js';
import { PostgresExpenseRepository } from '../modules/expenses/infrastructure/postgres-expenses.js';
import { ExpenseService } from '../modules/expenses/application/expense-service.js';
import { PostgresClinicalRepository } from '../modules/clinical/infrastructure/postgres-clinical.js';
import { ClinicalService } from '../modules/clinical/application/clinical-service.js';
import { PostgresPricingRepository } from '../modules/pricing/infrastructure/postgres-pricing.js';
import { PricingService } from '../modules/pricing/application/pricing-service.js';
import { PostgresLoyaltyRepository } from '../modules/loyalty/infrastructure/postgres-loyalty.js';
import { LoyaltyService } from '../modules/loyalty/application/loyalty-service.js';
import { PostgresBackupRepository } from '../modules/backup/infrastructure/postgres-backup.js';
import { BackupService } from '../modules/backup/application/backup-service.js';
import { PostgresAttendanceRepository } from '../modules/attendance/infrastructure/postgres-attendance.js';
import { AttendanceService } from '../modules/attendance/application/attendance-service.js';
import { ReplenishmentService } from '../modules/replenishment/application/replenishment-service.js';
import { Party360Service } from '../modules/party360/application/party360-service.js';
import { PostgresDrugMasterRepository } from '../modules/drugmaster/infrastructure/postgres-drug-master.js';
import { DrugMasterService } from '../modules/drugmaster/application/drug-master-service.js';
import { DocumentService } from '../modules/documents/application/document-service.js';
import { PostgresIdempotencyRepository } from '../modules/idempotency/infrastructure/postgres-idempotency.js';
import { OperationalAlertService } from '../modules/alerts/application/operational-alert-service.js';
import { ReconciliationService } from '../modules/reconciliation/application/reconciliation-service.js';
import { PostgresSalesDraftRepository } from '../modules/salesdrafts/infrastructure/postgres-sales-drafts.js';
import { SalesDraftService } from '../modules/salesdrafts/application/sales-draft-service.js';
import { DataImportService } from '../modules/dataimport/application/data-import-service.js';
import { ChromiumPdfRenderer } from '../modules/documents/infrastructure/chromium-pdf-renderer.js';
import { PostgresShortageRepository } from '../modules/shortages/infrastructure/postgres-shortages.js';
import { ShortageService } from '../modules/shortages/application/shortage-service.js';
import { PostgresInsuranceRepository } from '../modules/insurance/infrastructure/postgres-insurance.js';
import { InsuranceService } from '../modules/insurance/application/insurance-service.js';
import { PostgresTrackTraceRepository } from '../modules/tracktrace/infrastructure/postgres-tracktrace.js';
import { TrackTraceService } from '../modules/tracktrace/application/tracktrace-service.js';
import { AutomationService } from '../modules/automation/application/automation-service.js';
import { IntelligenceService } from '../modules/intelligence/application/intelligence-service.js';

export function createCompositionRoot(db: PostgresDatabase, config: AppConfig) {
  const organization = new PostgresOrganizationRepository(db);
  const identity = new PostgresIdentityRepository(db);
  const audit = new PostgresAuditRepository(db);
  const catalog = new PostgresCatalogRepository(db);
  const customers = new PostgresCustomerRepository(db);
  const suppliers = new PostgresSupplierRepository(db);
  const settings = new PostgresSettingsRepository(db);
  const inventory = new PostgresInventoryRepository(db);
  const cash = new PostgresCashRepository(db);
  const accounting = new PostgresAccountingRepository(db);
  const sales = new PostgresSalesRepository(db);
  const purchases = new PostgresPurchaseRepository(db);
  const reports = new PostgresReportRepository(db);
  const notifications = new PostgresNotificationRepository(db);
  const settlements = new PostgresSettlementRepository(db);
  const expenses = new PostgresExpenseRepository(db);
  const clinical = new PostgresClinicalRepository(db);
  const pricing = new PostgresPricingRepository(db);
  const loyaltyRepository = new PostgresLoyaltyRepository(db);
  const loyalty = new LoyaltyService(loyaltyRepository);
  const backup = new PostgresBackupRepository(db);
  const attendance = new PostgresAttendanceRepository(db);
  const drugMaster = new PostgresDrugMasterRepository(db);
  const idempotency = new PostgresIdempotencyRepository(db);
  const reconciliation = new ReconciliationService(sales, purchases, accounting, cash, inventory, settlements);
  const salesDrafts = new PostgresSalesDraftRepository(db);
  const pdfRenderer = new ChromiumPdfRenderer();
  const platformStore = new PostgresPlatformRepository(db);
  const shortages = new PostgresShortageRepository(db);
  const insurance = new PostgresInsuranceRepository(db);
  const trackTrace = new PostgresTrackTraceRepository(db);
  const trackTraceService = new TrackTraceService(trackTrace, inventory, audit, settings);
  const intelligenceService = new IntelligenceService(db, new ReplenishmentService(catalog, inventory, sales));
  const activation = new OwnerCenterActivationAdapter(config.ownerCenterUrl, config.ownerProductCode);

  return {
    organization,
    identity,
    audit,
    catalog,
    customers,
    suppliers,
    settings,
    inventory,
    inventoryService: new InventoryService(db, inventory, audit),
    cash,
    cashService: new CashService(db, cash, audit),
    accounting,
    sales,
    purchases,
    reports,
    notifications,
    settlements,
    expenses,
    clinical,
    pricing,
    loyalty,
    backup,
    attendance,
    drugMaster,
    idempotency,
    salesDrafts,
    shortages,
    insurance,
    trackTrace,
    trackTraceService,
    authService: new AuthService(identity, config.appSecret, config.sessionHours),
    catalogService: new CatalogService(catalog, audit),
    salesService: new SalesService(db, sales, catalog, inventory, cash, accounting, customers, audit, settlements, identity, clinical, pricing, loyalty, idempotency, trackTraceService, settings),
    purchaseService: new PurchaseService(db, purchases, suppliers, catalog, inventory, cash, accounting, audit, settlements),
    settlementService: new SettlementService(db, settlements, customers, suppliers, cash, accounting, audit),
    expenseService: new ExpenseService(db, expenses, cash, accounting, audit),
    clinicalService: new ClinicalService(clinical, audit),
    pricingService: new PricingService(db, pricing, catalog, audit),
    backupService: new BackupService(db, backup, audit, config.backupSecret),
    attendanceService: new AttendanceService(db, attendance, organization, audit),
    replenishmentService: new ReplenishmentService(catalog, inventory, sales),
    party360Service: new Party360Service(customers, suppliers, sales, purchases, settlements),
    drugMasterService: new DrugMasterService(db, drugMaster, catalog, audit),
    documentService: new DocumentService(sales, purchases, catalog, customers, suppliers, settings, organization, pdfRenderer),
    salesDraftService: new SalesDraftService(db, salesDrafts, audit),
    dataImportService: new DataImportService(db, catalog, customers, suppliers, inventory, organization, audit),
    shortageService: new ShortageService(db, shortages, audit),
    insuranceService: new InsuranceService(insurance, sales, audit, settings),
    automationService: new AutomationService(settings, new ReplenishmentService(catalog, inventory, sales)),
    intelligenceService,
    reconciliation,
    alertService: new OperationalAlertService(reports, notifications, cash, settlements, reconciliation),
    setupService: new SetupService(db, organization, identity, settings, audit, activation, platformStore, accounting, config.allowStandaloneSetup),
  };
}
