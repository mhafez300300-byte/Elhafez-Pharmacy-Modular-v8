import { newId } from '../../../core/types/id.js';
import { AppError } from '../../../core/errors/app-error.js';
export class ClinicalService {
    repo;
    audit;
    constructor(repo, audit) {
        this.repo = repo;
        this.audit = audit;
    }
    async doctor(t, u, i) { if (i.name.trim().length < 2)
        throw new AppError('DOCTOR_NAME_REQUIRED', 'اسم الطبيب مطلوب', 422); const v = { id: newId('doc'), tenantId: t, name: i.name.trim(), phone: i.phone?.trim() || null, specialty: i.specialty?.trim() || null, active: true }; const out = await this.repo.createDoctor(v); await this.audit.record({ tenantId: t, userId: u, action: 'clinical.doctor.created', entity: 'doctor', entityId: v.id }); return out; }
    async prescription(t, u, i) { if (!i.lines.length || i.lines.some(x => !x.productId || x.quantity <= 0))
        throw new AppError('PRESCRIPTION_INVALID', 'بيانات الروشتة غير صحيحة', 422); const v = { id: newId('rx'), tenantId: t, customerId: i.customerId ?? null, doctorId: i.doctorId ?? null, code: `RX-${Date.now().toString(36).toUpperCase()}`, issuedAt: new Date().toISOString(), expiresAt: i.expiresAt ?? null, status: 'active', lines: i.lines.map(x => ({ id: newId('rxl'), productId: x.productId, quantity: x.quantity, dose: x.dose?.trim() || null })) }; await this.repo.createPrescription(v); await this.audit.record({ tenantId: t, userId: u, action: 'clinical.prescription.created', entity: 'prescription', entityId: v.id, detail: { code: v.code } }); return v; }
    async recall(t, u, i) { if (!i.productId || i.reason.trim().length < 3)
        throw new AppError('RECALL_INVALID', 'بيانات السحب الدوائي غير مكتملة', 422); const v = { id: newId('rcl'), tenantId: t, productId: i.productId, batchNo: i.batchNo?.trim() || null, reason: i.reason.trim(), severity: i.severity, active: true, createdAt: new Date().toISOString() }; const out = await this.repo.createRecall(v); await this.audit.record({ tenantId: t, userId: u, action: 'clinical.recall.created', entity: 'recall', entityId: v.id, detail: { productId: v.productId, batchNo: v.batchNo, severity: v.severity } }); return out; }
    async interaction(t, u, i) { if (!i.productA || !i.productB || i.productA === i.productB || i.message.trim().length < 3)
        throw new AppError('INTERACTION_INVALID', 'بيانات التداخل الدوائي غير صحيحة', 422); const id = newId('int'); await this.repo.createInteraction({ id, tenantId: t, productA: i.productA, productB: i.productB, severity: i.severity, message: i.message.trim() }); await this.audit.record({ tenantId: t, userId: u, action: 'clinical.interaction.created', entity: 'interaction', entityId: id }); return { id }; }
}
