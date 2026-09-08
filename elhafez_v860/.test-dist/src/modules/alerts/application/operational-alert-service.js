export class OperationalAlertService {
    reports;
    notifications;
    cash;
    settlements;
    reconciliation;
    constructor(reports, notifications, cash, settlements, reconciliation) {
        this.reports = reports;
        this.notifications = notifications;
        this.cash = cash;
        this.settlements = settlements;
        this.reconciliation = reconciliation;
    }
    async refresh(t, b) {
        const [health, expiry, shifts, customerDue, supplierDue, integrity] = await Promise.all([
            this.reports.stockHealth(t, b), this.reports.stockAlerts(t, b), this.cash.listShifts(t, b, 100), this.settlements.listObligations(t, 'customer'), this.settlements.listObligations(t, 'supplier'), this.reconciliation.scan(t, b, 100),
        ]);
        const rows = health, batches = expiry, out = rows.filter(x => x.status === 'out').length, low = rows.filter(x => x.status === 'low').length;
        const now = new Date(), soon = new Date(now.getTime() + 30 * 86400_000), agedAt = Date.now() - 30 * 86400_000;
        const expired = batches.filter(x => x.expiryDate && new Date(`${x.expiryDate}T23:59:59Z`) < now).length;
        const expiring = batches.filter(x => { if (!x.expiryDate)
            return false; const d = new Date(`${x.expiryDate}T23:59:59Z`); return d >= now && d <= soon; }).length;
        const staleOpen = shifts.filter(x => x.status === 'open' && Date.now() - new Date(x.openedAt).getTime() > 16 * 3600_000).length;
        const variance = shifts.filter(x => x.status === 'closed' && x.closedAt && Date.now() - new Date(x.closedAt).getTime() <= 7 * 86400_000 && Math.abs(Number(x.variance ?? 0)) >= 0.01).length;
        const agedReceivables = customerDue.filter(x => x.balance > 0 && new Date(x.createdAt).getTime() < agedAt).length;
        const agedPayables = supplierDue.filter(x => x.balance > 0 && new Date(x.createdAt).getTime() < agedAt).length, integrityIssues = integrity.critical + integrity.warnings;
        await this.sync(t, `branch:${b}:out`, out, `نفاد مخزون — ${out} صنف`, `يوجد ${out} صنف بدون رصيد متاح للبيع.`, 'danger', 'inventory');
        await this.sync(t, `branch:${b}:low`, low, `مخزون منخفض — ${low} صنف`, `يوجد ${low} صنف وصل إلى حد إعادة الطلب أو أقل.`, 'warning', 'replenishment');
        await this.sync(t, `branch:${b}:expired`, expired, `تشغيلات منتهية — ${expired}`, `يوجد ${expired} تشغيلات منتهية الصلاحية وتحتاج مراجعة فورية.`, 'danger', 'inventory');
        await this.sync(t, `branch:${b}:expiring30`, expiring, `قرب انتهاء الصلاحية — ${expiring}`, `يوجد ${expiring} تشغيلات ستنتهي خلال 30 يومًا.`, 'warning', 'inventory');
        await this.sync(t, `branch:${b}:stale-shifts`, staleOpen, `ورديات مفتوحة منذ وقت طويل — ${staleOpen}`, `يوجد ${staleOpen} وردية مفتوحة لأكثر من 16 ساعة وتحتاج مراجعة.`, 'danger', 'cash');
        await this.sync(t, `branch:${b}:variance`, variance, `فروق ورديات — ${variance}`, `يوجد ${variance} وردية مغلقة خلال آخر 7 أيام بفارق نقدي غير صفري.`, 'warning', 'cash');
        await this.sync(t, 'finance:aged-receivables', agedReceivables, `ذمم عملاء أقدم من 30 يومًا — ${agedReceivables}`, `يوجد ${agedReceivables} مستحق عميل مفتوح منذ أكثر من 30 يومًا.`, 'warning', 'finance');
        await this.sync(t, 'finance:aged-payables', agedPayables, `ذمم موردين أقدم من 30 يومًا — ${agedPayables}`, `يوجد ${agedPayables} مستحق مورد مفتوح منذ أكثر من 30 يومًا.`, 'warning', 'finance');
        await this.sync(t, `branch:${b}:integrity`, integrityIssues, `مشاكل سلامة العمليات — ${integrityIssues}`, `اكتشف فحص الترابط ${integrityIssues} مشكلة بين المستندات والمخزون أو الخزينة أو الذمم أو المحاسبة.`, 'danger', 'reconciliation');
        return { outOfStock: out, lowStock: low, expiredBatches: expired, expiringSoonBatches: expiring, staleOpenShifts: staleOpen, shiftVariances: variance, agedReceivables, agedPayables, integrityIssues, generatedAt: new Date().toISOString() };
    }
    async sync(t, key, count, title, body, severity, link) { if (count > 0)
        await this.notifications.upsertAlert({ tenantId: t, dedupeKey: key, title, body, severity, link });
    else
        await this.notifications.resolveAlert(t, key); }
}
