import { Router } from 'express';
import { requirePermission } from '../../../core/http/require-permission.js';
import { requireAuth } from '../../../core/http/require-auth.js';
import { asyncHandler } from '../../../core/http/async-handler.js';
export const notificationRoutes = (n) => { const r = Router(); r.use(requireAuth); r.get('/', requirePermission('notifications.read'), asyncHandler(async (req, res) => res.json({ items: await n.list(req.auth.tenantId, req.auth.userId, Number(req.query.limit ?? 100)) }))); r.get('/unread-count', requirePermission('notifications.read'), asyncHandler(async (req, res) => res.json({ count: await n.unreadCount(req.auth.tenantId, req.auth.userId) }))); r.post('/:id/read', requirePermission('notifications.read'), asyncHandler(async (req, res) => { await n.markRead(req.auth.tenantId, req.auth.userId, req.params.id); res.status(204).end(); })); return r; };
