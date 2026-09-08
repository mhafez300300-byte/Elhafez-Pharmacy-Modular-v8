import { defaultSettingsPreferences } from '../contracts/settings-contract.js';
export class PostgresSettingsRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    ex(tx) { return tx ?? this.db; }
    async get(t, tx) { const r = (await this.ex(tx).query(`SELECT tenant_id as "tenantId",pharmacy_name as "pharmacyName",phone,address,email,whatsapp,tax_number as "taxNumber",commercial_registration as "commercialRegistration",invoice_footer as "invoiceFooter",preferences FROM sys_settings WHERE tenant_id=$1`, [t])).rows[0]; if (!r)
        return null; return { ...r, preferences: { ...defaultSettingsPreferences, ...(r.preferences ?? {}) } }; }
    async save(i, tx) { const prefs = { ...defaultSettingsPreferences, ...(i.preferences ?? {}) }; const r = (await this.ex(tx).query(`INSERT INTO sys_settings(tenant_id,pharmacy_name,phone,address,email,whatsapp,tax_number,commercial_registration,invoice_footer,preferences) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb) ON CONFLICT(tenant_id) DO UPDATE SET pharmacy_name=EXCLUDED.pharmacy_name,phone=EXCLUDED.phone,address=EXCLUDED.address,email=EXCLUDED.email,whatsapp=EXCLUDED.whatsapp,tax_number=EXCLUDED.tax_number,commercial_registration=EXCLUDED.commercial_registration,invoice_footer=EXCLUDED.invoice_footer,preferences=EXCLUDED.preferences,updated_at=now() RETURNING tenant_id as "tenantId",pharmacy_name as "pharmacyName",phone,address,email,whatsapp,tax_number as "taxNumber",commercial_registration as "commercialRegistration",invoice_footer as "invoiceFooter",preferences`, [i.tenantId, i.pharmacyName, i.phone, i.address, i.email, i.whatsapp, i.taxNumber, i.commercialRegistration, i.invoiceFooter, JSON.stringify(prefs)])).rows[0]; return { ...r, preferences: { ...defaultSettingsPreferences, ...(r.preferences ?? {}) } }; }
}
