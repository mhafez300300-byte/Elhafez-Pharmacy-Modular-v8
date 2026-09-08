import { Router } from 'express';
import { requireAuth } from '../../../core/http/require-auth.js';
import { requirePermission } from '../../../core/http/require-permission.js';
import { asyncHandler } from '../../../core/http/async-handler.js';
import { AppError } from '../../../core/errors/app-error.js';
export const intelligenceRoutes = (service, organization) => { const r = Router(); r.use(requireAuth); r.get('/snapshot', requirePermission('reports.read'), asyncHandler(async (req, res) => { const t = req.auth.tenantId, b = String(req.query.branchId ?? (await organization.getDefaultBranch(t))?.id ?? ''); if (!b)
    throw new AppError('BRANCH_REQUIRED', 'الفرع مطلوب', 422); const target = Math.min(90, Math.max(7, Number(req.query.targetDays ?? 21))), dead = Math.min(365, Math.max(30, Number(req.query.deadStockDays ?? 90))); res.json(await service.snapshot(t, b, target, dead)); })); return r; };
