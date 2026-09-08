import crypto from 'node:crypto';
import { AppError } from '../../../core/errors/app-error.js';
const keyFrom = (secret) => crypto.createHash('sha256').update(secret, 'utf8').digest();
const b64 = (b) => b.toString('base64url');
const unb64 = (s) => Buffer.from(s, 'base64url');
export class BackupService {
    uow;
    repo;
    audit;
    secret;
    constructor(uow, repo, audit, secret) {
        this.uow = uow;
        this.repo = repo;
        this.audit = audit;
        this.secret = secret;
    }
    async exportEncrypted(tenantId, userId) { const payload = await this.repo.exportSnapshot(); const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', keyFrom(this.secret), iv), plain = Buffer.from(JSON.stringify(payload), 'utf8'), encrypted = Buffer.concat([cipher.update(plain), cipher.final()]); const envelope = { format: 'ELHAFEZ_PHARMACY_BACKUP', version: 1, algorithm: 'aes-256-gcm', createdAt: new Date().toISOString(), iv: b64(iv), tag: b64(cipher.getAuthTag()), data: b64(encrypted) }; await this.audit.record({ tenantId, userId, action: 'backup.exported', entity: 'backup', entityId: envelope.createdAt, detail: { tables: payload.tables.length, bytes: plain.length } }); return envelope; }
    inspectEncrypted(tenantId, envelope) { const payload = this.decrypt(envelope), required = ['org_tenants', 'id_users', 'sys_settings'], names = new Set(payload.tables.map(t => t.name)), tenantMatch = !!payload.tables.find(t => t.name === 'org_tenants')?.rows.some(r => String(r.id) === tenantId), rows = payload.tables.reduce((n, t) => n + t.rows.length, 0), warnings = []; if (!tenantMatch)
        warnings.push('النسخة تخص شركة/مثيلاً مختلفًا'); if (!required.every(x => names.has(x)))
        warnings.push('بعض الجداول الأساسية غير موجودة'); if (payload.appVersion !== '8.6.0')
        warnings.push(`إصدار النسخة ${payload.appVersion} يختلف عن الإصدار الحالي 8.6.0`); return { compatible: payload.format === 'ELHAFEZ_PHARMACY_DB_SNAPSHOT' && payload.version === 1, tenantMatch, createdAt: payload.createdAt, appVersion: payload.appVersion, tables: payload.tables.length, rows, requiredTablesPresent: required.every(x => names.has(x)), warnings }; }
    async restoreEncrypted(tenantId, userId, envelope, confirmation) { if (confirmation !== 'RESTORE ELHAFEZ PHARMACY')
        throw new AppError('BACKUP_CONFIRMATION_REQUIRED', 'تأكيد الاستعادة غير صحيح', 422); const payload = this.decrypt(envelope), inspection = this.inspectEncrypted(tenantId, envelope); if (!inspection.tenantMatch)
        throw new AppError('BACKUP_TENANT_MISMATCH', 'النسخة لا تخص هذه الشركة/قاعدة البيانات', 409); if (!inspection.requiredTablesPresent)
        throw new AppError('BACKUP_INCOMPLETE', 'النسخة الاحتياطية غير مكتملة', 422); return this.uow.withTransaction(async (tx) => { await this.repo.restoreSnapshot(payload, tx); await this.audit.record({ tenantId, userId, action: 'backup.restored', entity: 'backup', entityId: payload.createdAt, detail: { tables: payload.tables.length, rows: inspection.rows } }, tx); return { restoredAt: new Date().toISOString(), tables: payload.tables.length }; }); }
    decrypt(envelope) { if (!envelope || envelope.format !== 'ELHAFEZ_PHARMACY_BACKUP' || envelope.version !== 1 || envelope.algorithm !== 'aes-256-gcm')
        throw new AppError('BACKUP_FORMAT_INVALID', 'ملف النسخة الاحتياطية غير متوافق', 422); try {
        const decipher = crypto.createDecipheriv('aes-256-gcm', keyFrom(this.secret), unb64(envelope.iv));
        decipher.setAuthTag(unb64(envelope.tag));
        const raw = Buffer.concat([decipher.update(unb64(envelope.data)), decipher.final()]).toString('utf8'), p = JSON.parse(raw);
        if (p.format !== 'ELHAFEZ_PHARMACY_DB_SNAPSHOT' || p.version !== 1 || !Array.isArray(p.tables))
            throw new Error('invalid payload');
        return p;
    }
    catch {
        throw new AppError('BACKUP_DECRYPT_FAILED', 'تعذر فتح النسخة الاحتياطية؛ الملف تالف أو مفتاح النسخ مختلف', 422);
    } }
}
