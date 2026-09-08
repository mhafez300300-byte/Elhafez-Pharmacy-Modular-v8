import { newId } from '../../../core/types/id.js';
import { AppError } from '../../../core/errors/app-error.js';
export class AttendanceService {
    uow;
    repo;
    org;
    audit;
    constructor(uow, repo, org, audit) {
        this.uow = uow;
        this.repo = repo;
        this.org = org;
        this.audit = audit;
    }
    async checkIn(t, u, branchId, note) { return this.uow.withTransaction(async (tx) => { const branch = branchId ? (await this.org.listBranches(t)).find(b => b.id === branchId && b.active) : await this.org.getDefaultBranch(t, tx); if (!branch)
        throw new AppError('BRANCH_REQUIRED', 'الفرع مطلوب', 422); const v = await this.repo.checkIn({ id: newId('att'), tenantId: t, userId: u, branchId: branch.id, note: note?.trim() || null }, tx); await this.audit.record({ tenantId: t, userId: u, action: 'attendance.check_in', entity: 'attendance', entityId: v.id, detail: { branchId: branch.id } }, tx); return v; }); }
    async checkOut(t, u, note) { return this.uow.withTransaction(async (tx) => { const v = await this.repo.checkOut(t, u, note?.trim() || null, tx); await this.audit.record({ tenantId: t, userId: u, action: 'attendance.check_out', entity: 'attendance', entityId: v.id, detail: {} }, tx); return v; }); }
}
