import express, { Router } from 'express';
import { requireAuth } from '../../../core/http/require-auth.js';
import { requirePermission } from '../../../core/http/require-permission.js';
import { asyncHandler } from '../../../core/http/async-handler.js';
import { AppError } from '../../../core/errors/app-error.js';
const raw = express.raw({ type: 'application/octet-stream', limit: '12mb' });
export const dataImportRoutes = (service) => { const r = Router(); r.use(requireAuth, requirePermission('imports.manage')); r.post('/preview', raw, asyncHandler(async (req, res) => res.json(await service.preview(req.auth.tenantId, String(req.query.kind ?? ''), String(req.headers['x-file-name'] ?? 'import.xlsx'), req.body, req.query.branchId ? String(req.query.branchId) : undefined)))); r.post('/commit', raw, asyncHandler(async (req, res) => { if (req.headers['x-import-confirm'] !== 'IMPORT')
    throw new AppError('IMPORT_CONFIRMATION_REQUIRED', 'يجب معاينة الملف وتأكيد الاستيراد أولًا', 422); res.status(201).json(await service.commit(req.auth.tenantId, req.auth.userId, String(req.query.kind ?? ''), String(req.headers['x-file-name'] ?? 'import.xlsx'), req.body, req.query.branchId ? String(req.query.branchId) : undefined)); })); return r; };
