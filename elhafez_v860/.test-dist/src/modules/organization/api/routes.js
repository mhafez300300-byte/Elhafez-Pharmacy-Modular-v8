import { Router } from 'express';
import { requireAuth } from '../../../core/http/require-auth.js';
import { asyncHandler } from '../../../core/http/async-handler.js';
import { requirePermission } from '../../../core/http/require-permission.js';
import { AppError } from '../../../core/errors/app-error.js';
import { newId } from '../../../core/types/id.js';
export function organizationRoutes(org) {
    const router = Router();
    router.use(requireAuth);
    router.get('/branches', asyncHandler(async (req, res) => res.json({ items: await org.listBranches(req.auth.tenantId) })));
    router.post('/branches', requirePermission('settings.manage'), asyncHandler(async (req, res) => { const name = String(req.body?.name ?? '').trim(); if (name.length < 2)
        throw new AppError('BRANCH_NAME_REQUIRED', 'اسم الفرع مطلوب', 422); res.status(201).json(await org.createBranch({ id: newId('br'), tenantId: req.auth.tenantId, name })); }));
    router.get('/me', asyncHandler(async (req, res) => {
        const tenant = await org.getTenant(req.auth.tenantId);
        res.json({ tenant, branch: await org.getDefaultBranch(req.auth.tenantId) });
    }));
    return router;
}
