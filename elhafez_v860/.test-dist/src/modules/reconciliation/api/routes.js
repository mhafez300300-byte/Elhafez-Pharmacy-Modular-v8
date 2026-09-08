import { Router } from 'express';
import { requireAuth } from '../../../core/http/require-auth.js';
import { requirePermission } from '../../../core/http/require-permission.js';
import { asyncHandler } from '../../../core/http/async-handler.js';
export const reconciliationRoutes = (service) => { const r = Router(); r.use(requireAuth, requirePermission('integrity.read')); r.get('/', asyncHandler(async (req, res) => { const branchId = req.query.branchId ? String(req.query.branchId) : undefined, limit = Math.max(1, Math.min(250, Number(req.query.limit || 100))); res.json(await service.scan(req.auth.tenantId, branchId, limit)); })); return r; };
