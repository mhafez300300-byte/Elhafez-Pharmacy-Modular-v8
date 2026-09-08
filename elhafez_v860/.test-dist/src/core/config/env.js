import { AppError } from '../errors/app-error.js';
const readInt = (name, fallback) => {
    const raw = process.env[name];
    if (!raw)
        return fallback;
    const value = Number(raw);
    if (!Number.isInteger(value) || value <= 0)
        throw new AppError('CONFIG_INVALID', `${name} must be a positive integer`, 500);
    return value;
};
export function loadConfig() {
    const databaseUrl = process.env.DATABASE_URL?.trim() ?? '';
    const appSecret = process.env.APP_SECRET?.trim() ?? '';
    const backupSecret = process.env.BACKUP_SECRET?.trim() || appSecret;
    if (!databaseUrl)
        throw new AppError('CONFIG_DATABASE_URL_REQUIRED', 'DATABASE_URL is required', 500);
    if (appSecret.length < 32)
        throw new AppError('CONFIG_APP_SECRET_WEAK', 'APP_SECRET must be at least 32 characters', 500);
    if (backupSecret.length < 32)
        throw new AppError('CONFIG_BACKUP_SECRET_WEAK', 'BACKUP_SECRET must be at least 32 characters', 500);
    const ownerCenterUrl = process.env.OWNER_CENTER_URL?.trim();
    return {
        env: process.env.NODE_ENV ?? 'development',
        port: readInt('PORT', 3000),
        host: process.env.HOST?.trim() || '0.0.0.0',
        databaseUrl,
        appSecret,
        backupSecret,
        sessionHours: readInt('SESSION_HOURS', 12),
        allowStandaloneSetup: String(process.env.ALLOW_STANDALONE_SETUP ?? 'false').toLowerCase() === 'true',
        ...(ownerCenterUrl ? { ownerCenterUrl } : {}),
        ownerProductCode: process.env.OWNER_PRODUCT_CODE?.trim() || 'PHARMAFLOW',
        drugMasterAutoSeed: String(process.env.DRUG_MASTER_AUTO_SEED ?? 'true').toLowerCase() === 'true',
        drugMasterSeedFile: process.env.DRUG_MASTER_SEED_FILE?.trim() || 'data/drug-master-egypt-reference.csv.br',
        alertRefreshMinutes: readInt('ALERT_REFRESH_MINUTES', 15),
        cleanupHours: readInt('SECURITY_CLEANUP_HOURS', 6),
    };
}
