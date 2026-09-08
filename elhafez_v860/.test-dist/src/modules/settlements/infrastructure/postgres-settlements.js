import { AppError } from '../../../core/errors/app-error.js';
import { newId } from '../../../core/types/id.js';
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
export class PostgresSettlementRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    ex(tx) { return tx ?? this.db; }
    async createObligation(i, tx) { if (i.amount <= 0)
        return; await tx.query(`INSERT INTO fin_obligations(id,tenant_id,party_type,party_id,reference_type,reference_id,original_amount,balance,status) VALUES($1,$2,$3,$4,$5,$6,$7,$7,'open')`, [i.id, i.tenantId, i.partyType, i.partyId, i.referenceType, i.referenceId, round2(i.amount)]); }
    async reduceObligationByReference(i, tx) { if (i.amount <= 0)
        return { applied: 0, excess: 0, creditId: null, partyType: i.partyType, partyId: i.partyId }; const amount = round2(i.amount), q = await tx.query(`SELECT id,balance::float balance,party_type,party_id FROM fin_obligations WHERE tenant_id=$1 AND reference_type=$2 AND reference_id=$3 FOR UPDATE`, [i.tenantId, i.referenceType, i.referenceId]), o = q.rows[0]; if (o && (o.party_type !== i.partyType || o.party_id !== i.partyId))
        throw new AppError('SETTLEMENT_PARTY_MISMATCH', 'الطرف لا يطابق المستند المالي', 409); const applied = round2(Math.min(amount, o?.balance ?? 0)), excess = round2(amount - applied); if (o && applied > 0) {
        const b = round2(o.balance - applied);
        await tx.query(`UPDATE fin_obligations SET balance=$2,status=CASE WHEN $2=0 THEN 'settled' WHEN $2<original_amount THEN 'partial' ELSE 'open' END WHERE id=$1`, [o.id, b]);
    } let creditId = null; if (excess > 0) {
        creditId = newId('crd');
        const r = await tx.query(`INSERT INTO fin_party_credits(id,tenant_id,party_type,party_id,reference_type,reference_id,original_amount,balance,status) VALUES($1,$2,$3,$4,$5,$6,$7,$7,'open') ON CONFLICT(tenant_id,reference_type,reference_id) DO UPDATE SET original_amount=fin_party_credits.original_amount+EXCLUDED.original_amount,balance=fin_party_credits.balance+EXCLUDED.balance,status='open' RETURNING id`, [creditId, i.tenantId, i.partyType, i.partyId, i.creditReferenceType ?? 'return_credit', i.creditReferenceId ?? i.referenceId, excess]);
        creditId = r.rows[0]?.id ?? creditId;
    } return { applied, excess, creditId, partyType: i.partyType, partyId: i.partyId }; }
    async listObligations(t, pt, pid) { const q = await this.db.query(`SELECT id,tenant_id as "tenantId",party_type as "partyType",party_id as "partyId",reference_type as "referenceType",reference_id as "referenceId",original_amount::float as "originalAmount",balance::float,status,created_at::text as "createdAt" FROM fin_obligations WHERE tenant_id=$1 AND ($2::text IS NULL OR party_type=$2) AND ($3::text IS NULL OR party_id=$3) ORDER BY created_at DESC`, [t, pt ?? null, pid ?? null]); return q.rows; }
    async obligationByReference(t, referenceType, referenceId) { const q = await this.db.query(`SELECT id,tenant_id as "tenantId",party_type as "partyType",party_id as "partyId",reference_type as "referenceType",reference_id as "referenceId",original_amount::float as "originalAmount",balance::float,status,created_at::text as "createdAt" FROM fin_obligations WHERE tenant_id=$1 AND reference_type=$2 AND reference_id=$3 LIMIT 1`, [t, referenceType, referenceId]); return q.rows[0] ?? null; }
    async balance(t, pt, pid, tx) { const q = await this.ex(tx).query(`SELECT COALESCE(sum(balance),0)::float v FROM fin_obligations WHERE tenant_id=$1 AND party_type=$2 AND party_id=$3`, [t, pt, pid]); return q.rows[0]?.v ?? 0; }
    async listCredits(t, pt, pid) { const q = await this.db.query(`SELECT id,tenant_id as "tenantId",party_type as "partyType",party_id as "partyId",reference_type as "referenceType",reference_id as "referenceId",original_amount::float as "originalAmount",balance::float,status,created_at::text as "createdAt" FROM fin_party_credits WHERE tenant_id=$1 AND ($2::text IS NULL OR party_type=$2) AND ($3::text IS NULL OR party_id=$3) ORDER BY created_at DESC`, [t, pt ?? null, pid ?? null]); return q.rows; }
    async creditBalance(t, pt, pid, tx) { const q = await this.ex(tx).query(`SELECT COALESCE(sum(balance),0)::float v FROM fin_party_credits WHERE tenant_id=$1 AND party_type=$2 AND party_id=$3`, [t, pt, pid]); return q.rows[0]?.v ?? 0; }
    async allocatePayment(i, tx) { if (i.amount <= 0)
        throw new AppError('PAYMENT_AMOUNT_INVALID', 'قيمة السداد يجب أن تكون أكبر من صفر', 422); if ((i.partyType === 'customer' && i.direction !== 'receive') || (i.partyType === 'supplier' && i.direction !== 'pay'))
        throw new AppError('PAYMENT_DIRECTION_INVALID', 'اتجاه السداد لا يطابق نوع الطرف', 422); const amount = round2(i.amount); const open = await tx.query(`SELECT id,balance::float balance FROM fin_obligations WHERE tenant_id=$1 AND party_type=$2 AND party_id=$3 AND balance>0 ORDER BY created_at,id FOR UPDATE`, [i.tenantId, i.partyType, i.partyId]); let remaining = amount; const allocations = []; for (const o of open.rows) {
        if (remaining <= 0)
            break;
        const a = round2(Math.min(remaining, o.balance));
        if (a <= 0)
            continue;
        const b = round2(o.balance - a);
        await tx.query(`UPDATE fin_obligations SET balance=$2,status=CASE WHEN $2=0 THEN 'settled' ELSE 'partial' END WHERE id=$1`, [o.id, b]);
        allocations.push({ obligationId: o.id, amount: a });
        remaining = round2(remaining - a);
    } await tx.query(`INSERT INTO fin_payments(id,tenant_id,branch_id,party_type,party_id,direction,method,amount,unallocated,reference) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [i.id, i.tenantId, i.branchId, i.partyType, i.partyId, i.direction, i.method, amount, remaining, i.reference ?? null]); for (const a of allocations)
        await tx.query(`INSERT INTO fin_allocations(payment_id,obligation_id,amount) VALUES($1,$2,$3)`, [i.id, a.obligationId, a.amount]); return { id: i.id, tenantId: i.tenantId, branchId: i.branchId, partyType: i.partyType, partyId: i.partyId, direction: i.direction, method: i.method, amount, unallocated: remaining, createdAt: new Date().toISOString(), allocations }; }
    async listPayments(t, pt, pid) { const q = await this.db.query(`SELECT p.id,p.tenant_id as "tenantId",p.branch_id as "branchId",p.party_type as "partyType",p.party_id as "partyId",p.direction,p.method,p.amount::float,p.unallocated::float,p.created_at::text as "createdAt",COALESCE(json_agg(json_build_object('obligationId',a.obligation_id,'amount',a.amount::float)) FILTER(WHERE a.id IS NOT NULL),'[]'::json) allocations FROM fin_payments p LEFT JOIN fin_allocations a ON a.payment_id=p.id WHERE p.tenant_id=$1 AND ($2::text IS NULL OR p.party_type=$2) AND ($3::text IS NULL OR p.party_id=$3) GROUP BY p.id ORDER BY p.created_at DESC`, [t, pt ?? null, pid ?? null]); return q.rows; }
}
