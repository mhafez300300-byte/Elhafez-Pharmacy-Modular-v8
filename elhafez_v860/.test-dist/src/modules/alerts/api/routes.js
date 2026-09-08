import { Router } from 'express';
import { requireAuth } from '../../../core/http/require-auth.js';
import { requirePermission } from '../../../core/http/require-permission.js';
import { asyncHandler } from '../../../core/http/async-handler.js';
import { AppError } from '../../../core/errors/app-error.js';
export const alertRoutes = (alerts, org) => { const r = Router(); r.use(requireAuth, requirePermission('notifications.read')); r.post('/refresh', asyncHandler(async (req, res) => { const b = String(req.body?.branchId ?? (await org.getDefaultBranch(req.auth.tenantId))?.id ?? ''); if (!b)
    throw new AppError('BRANCH_REQUIRED', 'الفرع مطلوب', 422); res.json(await alerts.refresh(req.auth.tenantId, b)); })); return r; };
