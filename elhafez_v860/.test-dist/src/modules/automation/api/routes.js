import { Router } from 'express';
import { requireAuth } from '../../../core/http/require-auth.js';
import { requirePermission } from '../../../core/http/require-permission.js';
import { asyncHandler } from '../../../core/http/async-handler.js';
export const automationRoutes = (s) => { const r = Router(); r.use(requireAuth); r.get('/snapshot', requirePermission('reports.read'), asyncHandler(async (req, res) => res.json(await s.snapshot(req.auth.tenantId, String(req.query.branchId ?? ''))))); return r; };
