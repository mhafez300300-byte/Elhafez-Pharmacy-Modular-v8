import { readFile } from 'node:fs/promises';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';
import { normalizeDrugMaster, parseActiveIngredients, parseBoolean } from '../domain/drug-master.js';
export async function seedReferenceDrugMaster(db, filePath) {
    const current = Number((await db.query(`SELECT count(*)::text count FROM drug_master`)).rows[0]?.count ?? 0);
    if (current > 0)
        return { seeded: false, count: current };
    let csv = '';
    try {
        const raw = await readFile(filePath);
        if (filePath.endsWith('.br'))
            csv = brotliDecompressSync(raw).toString();
        else if (filePath.endsWith('.b64')) {
            const decoded = Buffer.from(raw.toString().trim(), 'base64');
            csv = filePath.includes('.br.') ? brotliDecompressSync(decoded).toString() : filePath.includes('.gz.') ? gunzipSync(decoded).toString() : decoded.toString();
        }
        else
            csv = filePath.endsWith('.gz') ? gunzipSync(raw).toString() : raw.toString();
    }
    catch (e) {
        if (e?.code === 'ENOENT')
            return { seeded: false, count: 0, missing: true };
        throw e;
    }
    const sourceRows = parseSeedCsv(csv);
    const deduped = dedupe(sourceRows);
    let inserted = 0;
    for (let start = 0; start < deduped.length; start += 250) {
        const batch = deduped.slice(start, start + 250);
        await db.withTransaction(async (tx) => { const params = []; const tuples = batch.map((d, index) => { const stable = d.gtin || d.barcode || `${d.nameAr}|${d.manufacturer ?? ''}|${d.strength ?? ''}`; const id = `drug_${Buffer.from(stable).toString('base64url').slice(0, 80)}`; const base = index * 14; params.push(id, d.gtin, d.barcode, d.nameAr, d.nameEn, JSON.stringify(d.activeIngredients), d.strength, d.dosageForm, d.manufacturer, d.requiresPrescription, d.controlledClass, d.officialPrice, d.source, d.sourceUpdatedAt); return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6}::jsonb,$${base + 7},$${base + 8},$${base + 9},$${base + 10},$${base + 11},$${base + 12},$${base + 13},$${base + 14})`; }); await tx.query(`INSERT INTO drug_master(id,gtin,barcode,name_ar,name_en,active_ingredients,strength,dosage_form,manufacturer,requires_prescription,controlled_class,official_price,source,source_updated_at) VALUES ${tuples.join(',')} ON CONFLICT(id) DO UPDATE SET gtin=EXCLUDED.gtin,barcode=EXCLUDED.barcode,name_ar=EXCLUDED.name_ar,name_en=EXCLUDED.name_en,active_ingredients=EXCLUDED.active_ingredients,strength=EXCLUDED.strength,dosage_form=EXCLUDED.dosage_form,manufacturer=EXCLUDED.manufacturer,requires_prescription=EXCLUDED.requires_prescription,controlled_class=EXCLUDED.controlled_class,official_price=EXCLUDED.official_price,source=EXCLUDED.source,source_updated_at=EXCLUDED.source_updated_at,updated_at=now()`, params); });
        inserted += batch.length;
    }
    return { seeded: true, count: inserted };
}
function dedupe(rows) { const seenId = new Set(), seenBarcode = new Set(), seenGtin = new Set(), out = []; for (const d of rows) {
    const stable = d.gtin || d.barcode || `${d.nameAr}|${d.manufacturer ?? ''}|${d.strength ?? ''}`;
    if (seenId.has(stable))
        continue;
    if (d.gtin && seenGtin.has(d.gtin))
        continue;
    if (d.barcode && seenBarcode.has(d.barcode))
        continue;
    seenId.add(stable);
    if (d.gtin)
        seenGtin.add(d.gtin);
    if (d.barcode)
        seenBarcode.add(d.barcode);
    out.push(d);
} return out; }
function parseSeedCsv(text) { const rows = csvRows(text.replace(/^\uFEFF/, '')); if (rows.length < 2)
    return []; const headers = rows[0].map(x => x.trim()), out = []; for (const cells of rows.slice(1)) {
    const r = Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? '']));
    if (!String(r.nameAr ?? '').trim())
        continue;
    try {
        out.push(normalizeDrugMaster({ nameAr: String(r.nameAr), barcode: r.barcode || null, gtin: r.gtin || null, activeIngredients: parseActiveIngredients(String(r.activeIngredients ?? '')), strength: r.strength || null, dosageForm: r.dosageForm || null, manufacturer: r.manufacturer || null, officialPrice: r.officialPrice ? Number(r.officialPrice) : null, requiresPrescription: parseBoolean(r.requiresPrescription), source: r.source || 'seed' }));
    }
    catch { /* Bad reference row is ignored; interactive imports report row errors. */ }
} return out; }
function csvRows(text) { const out = []; let row = [], cell = '', quoted = false; for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
        if (c === '"' && text[i + 1] === '"') {
            cell += '"';
            i++;
        }
        else if (c === '"')
            quoted = false;
        else
            cell += c;
    }
    else if (c === '"')
        quoted = true;
    else if (c === ',') {
        row.push(cell);
        cell = '';
    }
    else if (c === '\n') {
        row.push(cell.replace(/\r$/, ''));
        out.push(row);
        row = [];
        cell = '';
    }
    else
        cell += c;
} row.push(cell.replace(/\r$/, '')); if (row.length > 1 || row[0])
    out.push(row); return out; }
