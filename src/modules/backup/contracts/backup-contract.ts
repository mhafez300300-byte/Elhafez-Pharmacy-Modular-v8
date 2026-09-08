import type { DbTx } from '../../../core/db/types.js';

export type BackupTable = Readonly<{ name: string; rows: readonly Record<string, unknown>[] }>;
export type BackupPayload = Readonly<{ format: 'ELHAFEZ_PHARMACY_DB_SNAPSHOT'; version: 1; appVersion: string; createdAt: string; tables: readonly BackupTable[] }>;
export type EncryptedBackupEnvelope = Readonly<{ format: 'ELHAFEZ_PHARMACY_BACKUP'; version: 1; algorithm: 'aes-256-gcm'; createdAt: string; iv: string; tag: string; data: string }>;
export type BackupInspection = Readonly<{compatible:boolean;tenantMatch:boolean;createdAt:string;appVersion:string;tables:number;rows:number;requiredTablesPresent:boolean;warnings:readonly string[]}>;
export interface BackupContract { exportSnapshot(): Promise<BackupPayload>; restoreSnapshot(snapshot: BackupPayload, tx: DbTx): Promise<void>; }
