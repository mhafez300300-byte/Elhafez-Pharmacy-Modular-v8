import { AppError } from '../../../core/errors/app-error.js';
import { newId } from '../../../core/types/id.js';
import { defaultSettingsPreferences } from '../../settings/contracts/settings-contract.js';
export class SetupService {
    uow;
    org;
    identity;
    settings;
    audit;
    activation;
    platformStore;
    accounting;
    allowStandalone;
    constructor(uow, org, identity, settings, audit, activation, platformStore, accounting, allowStandalone) {
        this.uow = uow;
        this.org = org;
        this.identity = identity;
        this.settings = settings;
        this.audit = audit;
        this.activation = activation;
        this.platformStore = platformStore;
        this.accounting = accounting;
        this.allowStandalone = allowStandalone;
    }
    async status() { const q = await this.org.getTenant('default').catch(() => null); return { configured: !!q }; }
    async setup(input) { const pharmacyName = input.pharmacyName.trim(), branchName = input.branchName.trim(), adminName = input.adminName.trim(), adminUsername = input.adminUsername.trim(); if (pharmacyName.length < 2 || branchName.length < 2)
        throw new AppError('SETUP_NAMES_REQUIRED', 'اسم الصيدلية والفرع مطلوبان', 422); if (adminName.length < 2 || adminUsername.length < 2)
        throw new AppError('SETUP_ADMIN_REQUIRED', 'بيانات المدير مطلوبة', 422); if (!/^\d{4,8}$/.test(input.adminPin))
        throw new AppError('SETUP_PIN_INVALID', 'PIN المدير يجب أن يكون من 4 إلى 8 أرقام', 422); let claims = null; if (input.companyCode?.trim())
        claims = await this.activation.resolve(input.companyCode.trim()); if (!claims && !this.allowStandalone)
        throw new AppError('OWNER_ACTIVATION_REQUIRED', 'يلزم كود شركة صالح من مركز المالك', 412); if (claims && ['suspended', 'expired'].includes(claims.status))
        throw new AppError('OWNER_SUBSCRIPTION_INACTIVE', 'اشتراك الشركة غير نشط', 403); return this.uow.withTransaction(async (tx) => { const existing = await tx.query('SELECT id FROM org_tenants LIMIT 1'); if (existing.rowCount)
        throw new AppError('SETUP_ALREADY_COMPLETED', 'تم إعداد النظام بالفعل', 409); const tenantId = 'default', branchId = newId('brn'), userId = newId('usr'); const name = claims?.customerName || pharmacyName; const { tenant, branch } = await this.org.createTenantWithBranch({ tenantId, name, currency: input.currency || 'EGP', branchId, branchName }, tx); const user = await this.identity.createOwner({ id: userId, tenantId, name: adminName, username: adminUsername, pin: input.adminPin }, tx); await this.settings.save({ tenantId, pharmacyName: name, phone: null, address: null, email: null, whatsapp: null, taxNumber: null, commercialRegistration: null, invoiceFooter: null, preferences: defaultSettingsPreferences }, tx); await this.accounting.ensureDefaultChart(tenantId, tx); await this.platformStore.saveActivation({ tenantId, companyCode: claims?.customerCode ?? null, mode: claims ? 'owner_center' : 'standalone', status: claims?.status ?? 'trial', plan: claims?.plan ?? 'trial', expiresAt: claims?.expiresAt ?? null, features: claims?.features ?? [] }, tx); await this.audit.record({ tenantId, userId, action: 'system.setup', entity: 'tenant', entityId: tenantId, detail: { branchId, mode: claims ? 'owner_center' : 'standalone' } }, tx); return { tenant, branch, user, mode: claims ? 'owner_center' : 'standalone' }; }); }
}
