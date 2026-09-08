import { AppError } from '../../../core/errors/app-error.js';
import { newId } from '../../../core/types/id.js';
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
export class InsuranceService {
    repo;
    sales;
    audit;
    settings;
    constructor(repo, sales, audit, settings) {
        this.repo = repo;
        this.sales = sales;
        this.audit = audit;
        this.settings = settings;
    }
    async addProvider(t, u, i) { if (i.name.trim().length < 2)
        throw new AppError('INS_PROVIDER_NAME_REQUIRED', 'اسم جهة التعاقد مطلوب', 422); const x = await this.repo.saveProvider({ id: newId('inp'), tenantId: t, name: i.name.trim(), code: i.code?.trim() || null, phone: i.phone?.trim() || null, active: true, createdAt: new Date().toISOString() }); await this.audit.record({ tenantId: t, userId: u, action: 'insurance.provider.created', entity: 'insurance_provider', entityId: x.id }); return x; }
    async addPlan(t, u, i) { const cov = Math.max(0, Math.min(100, Number(i.coveragePercent))), cop = i.copayPercent == null ? 100 - cov : Math.max(0, Math.min(100, Number(i.copayPercent))); if (i.name.trim().length < 2)
        throw new AppError('INS_PLAN_NAME_REQUIRED', 'اسم الخطة مطلوب', 422); const x = await this.repo.savePlan({ id: newId('ipl'), tenantId: t, providerId: i.providerId, name: i.name.trim(), coveragePercent: cov, copayPercent: cop, annualLimit: i.annualLimit == null ? null : Number(i.annualLimit), active: true }); await this.audit.record({ tenantId: t, userId: u, action: 'insurance.plan.created', entity: 'insurance_plan', entityId: x.id }); return x; }
    async createClaim(t, u, i) { const settings = this.settings ? await this.settings.get(t) : null; if (settings?.preferences.insuranceEnabled === false)
        throw new AppError('INSURANCE_DISABLED', 'التأمين والتعاقدات غير مفعلة من الإعدادات', 409); if (await this.repo.findBySale(t, i.saleId))
        throw new AppError('INS_CLAIM_EXISTS', 'تم إنشاء مطالبة لهذه الفاتورة بالفعل', 409); const sale = await this.sales.get(t, i.saleId); if (!sale)
        throw new AppError('SALE_NOT_FOUND', 'فاتورة البيع غير موجودة', 404); let pct = Number(i.coveragePercent ?? settings?.preferences.insuranceDefaultCoveragePercent ?? 80); if (i.planId) {
        const plan = (await this.repo.listPlans(t, i.providerId)).find(x => x.id === i.planId);
        if (!plan)
            throw new AppError('INS_PLAN_NOT_FOUND', 'خطة التأمين غير موجودة', 404);
        pct = plan.coveragePercent;
    } pct = Math.max(0, Math.min(100, pct)); const covered = r2(sale.total * pct / 100), patient = r2(sale.total - covered), now = new Date().toISOString(); const claim = { id: newId('clm'), tenantId: t, saleId: sale.id, customerId: sale.customerId, providerId: i.providerId, planId: i.planId ?? null, policyNumber: i.policyNumber?.trim() || null, patientName: i.patientName?.trim() || null, grossAmount: sale.total, coveredAmount: covered, patientAmount: patient, status: 'draft', referenceNo: null, note: i.note?.trim() || null, createdAt: now, updatedAt: now }; const x = await this.repo.saveClaim(claim); await this.audit.record({ tenantId: t, userId: u, action: 'insurance.claim.created', entity: 'insurance_claim', entityId: x.id, detail: { saleId: sale.id, coveredAmount: covered, patientAmount: patient } }); return x; }
    async status(t, u, id, status, referenceNo, note) { const current = await this.repo.getClaim(t, id); if (!current)
        throw new AppError('INS_CLAIM_NOT_FOUND', 'المطالبة غير موجودة', 404); const allowed = { draft: ['submitted', 'rejected'], submitted: ['approved', 'rejected'], approved: ['settled', 'rejected'], rejected: ['draft'], settled: [] }; if (!allowed[current.status].includes(status))
        throw new AppError('INS_CLAIM_STATUS_INVALID', 'انتقال حالة المطالبة غير مسموح', 409, { from: current.status, to: status }); const x = await this.repo.updateClaimStatus(t, id, status, referenceNo?.trim() || null, note?.trim() || null); await this.audit.record({ tenantId: t, userId: u, action: 'insurance.claim.status', entity: 'insurance_claim', entityId: id, detail: { from: current.status, to: status } }); return x; }
}
