import { Router } from 'express';
import { requirePermission, hasPermission } from '../../../core/http/require-permission.js';
import { requireAuth } from '../../../core/http/require-auth.js';
import { asyncHandler } from '../../../core/http/async-handler.js';
import { AppError } from '../../../core/errors/app-error.js';
export const reportRoutes = (reports, org) => {
    const r = Router();
    r.use(requireAuth);
    const branch = async (t, v) => String(v ?? (await org.getDefaultBranch(t))?.id ?? '');
    r.get('/dashboard', requirePermission('reports.read'), asyncHandler(async (req, res) => { const b = await branch(req.auth.tenantId, req.query.branchId); if (!b)
        throw new AppError('BRANCH_REQUIRED', 'الفرع مطلوب', 422); const d = await reports.dashboard(req.auth.tenantId, b), costVisible = hasPermission(req, 'cost.view'); res.json({ ...d, stockValue: costVisible ? d.stockValue : null, costVisible }); }));
    r.get('/sales', requirePermission('reports.read'), asyncHandler(async (req, res) => { const d = await reports.salesSummary(req.auth.tenantId, req.query.from ? String(req.query.from) : undefined, req.query.to ? String(req.query.to) : undefined), profitVisible = hasPermission(req, 'profit.view'); res.json({ ...d, items: Array.isArray(d.items) ? d.items.map((x) => profitVisible ? x : { ...x, profit: null }) : [], profitVisible }); }));
    r.get('/stock-alerts', requirePermission('reports.read'), asyncHandler(async (req, res) => { const b = await branch(req.auth.tenantId, req.query.branchId); res.json({ items: await reports.stockAlerts(req.auth.tenantId, b) }); }));
    r.get('/stock-health', requirePermission('reports.read'), asyncHandler(async (req, res) => { const b = await branch(req.auth.tenantId, req.query.branchId); const costVisible = hasPermission(req, 'cost.view'); const items = await reports.stockHealth(req.auth.tenantId, b); res.json({ items: items.map(x => costVisible ? x : { ...x, stockValue: null }), costVisible }); }));
    r.get('/supplier-performance', requirePermission('reports.read'), asyncHandler(async (req, res) => { const costVisible = hasPermission(req, 'cost.view'); const items = await reports.supplierPerformance(req.auth.tenantId); res.json({ items: items.map(x => costVisible ? x : { ...x, total: null, average: null, returnsTotal: null }), costVisible }); }));
    r.get('/party-balances', requirePermission('reports.read'), asyncHandler(async (req, res) => res.json(await reports.partyBalances(req.auth.tenantId))));
    r.get('/returns', requirePermission('reports.read'), asyncHandler(async (req, res) => res.json(await reports.returnAnalysis(req.auth.tenantId, req.query.from ? String(req.query.from) : undefined, req.query.to ? String(req.query.to) : undefined))));
    return r;
};
