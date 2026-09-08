import { Router } from 'express';
import { requireAuth } from '../../../core/http/require-auth.js';
import { requirePermission } from '../../../core/http/require-permission.js';
import { asyncHandler } from '../../../core/http/async-handler.js';
import { AppError } from '../../../core/errors/app-error.js';
export const replenishmentRoutes = (service, organization) => {
    const router = Router();
    router.use(requireAuth);
    router.get('/recommendations', requirePermission('purchases.read'), asyncHandler(async (req, res) => {
        const tenantId = req.auth.tenantId;
        const branchId = String(req.query.branchId ?? (await organization.getDefaultBranch(tenantId))?.id ?? '');
        if (!branchId)
            throw new AppError('BRANCH_REQUIRED', 'الفرع مطلوب', 422);
        const targetDays = Math.min(90, Math.max(7, Number(req.query.targetDays ?? 21)));
        const items = await service.recommendations(tenantId, branchId, targetDays);
        res.json({ items, targetDays, actionable: items.filter(x => x.suggestedQuantity > 0).length });
    }));
    return router;
};
