import { Router } from 'express';
import { requireAuth } from '../../../core/http/require-auth.js';
import { requirePermission } from '../../../core/http/require-permission.js';
import { asyncHandler } from '../../../core/http/async-handler.js';
export const drugMasterRoutes = (service, repo) => {
    const r = Router();
    r.use(requireAuth);
    r.get('/', requirePermission('catalog.read'), asyncHandler(async (req, res) => {
        res.json({ items: await repo.search(String(req.query.q ?? ''), Number(req.query.limit ?? 50)), count: await repo.count() });
    }));
    r.post('/import', requirePermission('catalog.master.manage'), asyncHandler(async (req, res) => {
        const result = typeof req.body?.csv === 'string'
            ? await service.importCsv(req.auth.tenantId, req.auth.userId, req.body.csv)
            : await service.importRows(req.auth.tenantId, req.auth.userId, Array.isArray(req.body?.rows) ? req.body.rows : []);
        res.json(result);
    }));
    r.post('/:id/adopt', requirePermission('catalog.manage'), asyncHandler(async (req, res) => {
        const input = {};
        if (req.body?.sellingPrice != null)
            input.sellingPrice = Number(req.body.sellingPrice);
        if (req.body?.costPrice != null)
            input.costPrice = Number(req.body.costPrice);
        if (req.body?.reorderLevel != null)
            input.reorderLevel = Number(req.body.reorderLevel);
        if (req.body?.taxRate != null)
            input.taxRate = Number(req.body.taxRate);
        res.status(201).json(await service.adopt(req.auth.tenantId, req.auth.userId, req.params.id, input));
    }));
    return r;
};
