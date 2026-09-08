import type { DbExecutor, DbTx } from '../../../core/db/types.js';
import { AppError } from '../../../core/errors/app-error.js';
import type { BackupContract, BackupPayload, BackupTable } from '../contracts/backup-contract.js';

const TABLE_ORDER = [
  'org_tenants','org_branches','id_users','attendance_sessions','sys_settings','platform_activation','audit_events','audit_heads',
  'cat_products','crm_customers','crm_suppliers',
  'inv_batches','inv_movements','inv_return_holds','inv_transfers','inv_transfer_lines','inv_counts','inv_count_lines',
  'cash_shifts','cash_movements','acc_accounts','acc_periods','acc_journal_entries','acc_journal_lines',
  'draft_sales_carts','sales_counters','sales_invoices','sales_lines','sales_returns','sales_return_lines',
  'purchase_counters','purchase_order_counters','purchase_orders','purchase_order_lines','purchase_receipts','purchase_lines','purchase_returns','purchase_return_lines',
  'notifications','fin_obligations','fin_party_credits','fin_party_credits','fin_payments','fin_allocations','exp_expenses',
  'ph_doctors','ph_prescriptions','ph_prescription_lines','ph_recalls','ph_interactions',
  'pr_offers','pr_price_updates','loy_rules','loy_accounts','loy_ledger'
] as const;

const EPHEMERAL_CLEAR=['id_sessions','id_login_attempts','idem_keys'] as const;
const qi=(name:string)=>`"${name.replaceAll('\"','\"\"')}"`;

export class PostgresBackupRepository implements BackupContract {
  constructor(private readonly db: DbExecutor) {}

  async exportSnapshot(): Promise<BackupPayload> {
    const tables: BackupTable[]=[];
    for(const name of TABLE_ORDER){
      const exists=await this.db.query<{ok:boolean}>(`SELECT to_regclass($1) IS NOT NULL AS ok`,[name]);
      if(!exists.rows[0]?.ok)continue;
      const rows=(await this.db.query<Record<string,unknown>>(`SELECT * FROM ${qi(name)}`)).rows;
      tables.push({name,rows});
    }
    return {format:'ELHAFEZ_PHARMACY_DB_SNAPSHOT',version:1,appVersion:'8.0.0',createdAt:new Date().toISOString(),tables};
  }

  async restoreSnapshot(snapshot: BackupPayload, tx: DbTx): Promise<void> {
    if(snapshot.format!=='ELHAFEZ_PHARMACY_DB_SNAPSHOT'||snapshot.version!==1)throw new AppError('BACKUP_FORMAT_INVALID','ملف النسخة الاحتياطية غير متوافق',422);
    const allowed=new Set<string>(TABLE_ORDER);
    const byName=new Map(snapshot.tables.map(t=>[t.name,t]));
    for(const table of snapshot.tables)if(!allowed.has(table.name))throw new AppError('BACKUP_TABLE_INVALID','ملف النسخة الاحتياطية يحتوي جدولاً غير مسموح',422,{table:table.name});
    const present=TABLE_ORDER.filter(name=>byName.has(name));
    if(!present.includes('org_tenants')||!present.includes('id_users'))throw new AppError('BACKUP_INCOMPLETE','النسخة الاحتياطية غير مكتملة',422);

    // Restore is intentionally whole-instance. All application data is replaced atomically.
    const existing=await tx.query<{name:string}>(`SELECT tablename AS name FROM pg_tables WHERE schemaname=current_schema()`);
    const existingSet=new Set(existing.rows.map(x=>x.name));
    const toClear=[...new Set([...TABLE_ORDER,...EPHEMERAL_CLEAR])].filter(t=>existingSet.has(t)).reverse();
    if(toClear.length)await tx.query(`TRUNCATE ${toClear.map(qi).join(', ')} RESTART IDENTITY CASCADE`);

    for(const name of TABLE_ORDER){
      const table=byName.get(name);if(!table)continue;
      for(const row of table.rows){
        const columns=Object.keys(row);
        if(!columns.length)continue;
        const values=columns.map(k=>row[k]);
        const placeholders=columns.map((_,i)=>`$${i+1}`).join(',');
        await tx.query(`INSERT INTO ${qi(name)} (${columns.map(qi).join(',')}) VALUES (${placeholders})`,values);
      }
    }
  }
}
