import { AppError } from '../../../core/errors/app-error.js';
const projection = `id,tenant_id as "tenantId",user_id as "userId",branch_id as "branchId",check_in::text as "checkIn",check_out::text as "checkOut",note`;
export class PostgresAttendanceRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    ex(tx) { return tx ?? this.db; }
    async getOpen(t, u, tx) { return (await this.ex(tx).query(`SELECT ${projection} FROM attendance_sessions WHERE tenant_id=$1 AND user_id=$2 AND check_out IS NULL ORDER BY check_in DESC LIMIT 1`, [t, u])).rows[0] ?? null; }
    async checkIn(i, tx) { if (await this.getOpen(i.tenantId, i.userId, tx))
        throw new AppError('ATTENDANCE_ALREADY_OPEN', 'تم تسجيل الحضور بالفعل ولم يتم الانصراف', 409); return (await this.ex(tx).query(`INSERT INTO attendance_sessions(id,tenant_id,user_id,branch_id,note) VALUES($1,$2,$3,$4,$5) RETURNING ${projection}`, [i.id, i.tenantId, i.userId, i.branchId, i.note ?? null])).rows[0]; }
    async checkOut(t, u, note, tx) { const q = await this.ex(tx).query(`UPDATE attendance_sessions SET check_out=now(),note=COALESCE($3,note) WHERE id=(SELECT id FROM attendance_sessions WHERE tenant_id=$1 AND user_id=$2 AND check_out IS NULL ORDER BY check_in DESC LIMIT 1) RETURNING ${projection}`, [t, u, note ?? null]); if (!q.rowCount)
        throw new AppError('ATTENDANCE_NOT_OPEN', 'لا يوجد حضور مفتوح لتسجيل الانصراف', 409); return q.rows[0]; }
    async history(t, u, limit = 100) { return (await this.db.query(`SELECT ${projection} FROM attendance_sessions WHERE tenant_id=$1 AND ($2::text IS NULL OR user_id=$2) ORDER BY check_in DESC LIMIT $3`, [t, u ?? null, Math.min(500, Math.max(1, limit))])).rows; }
}
