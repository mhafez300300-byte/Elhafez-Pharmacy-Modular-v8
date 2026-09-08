export class AutomationService {
    settings;
    replenishment;
    constructor(settings, replenishment) {
        this.settings = settings;
        this.replenishment = replenishment;
    }
    async snapshot(t, b) { const s = await this.settings.get(t), p = s?.preferences, recs = p?.reorderSuggestionsEnabled === false ? [] : await this.replenishment.recommendations(t, b, p?.lowStockCoverageDays ?? 21); return { enabled: true, reorderEnabled: p?.reorderSuggestionsEnabled !== false, traceSalesEnabled: p?.trackTraceAutoSales !== false, dailyBriefEnabled: p?.dailyBriefEnabled !== false, shortageCaptureEnabled: p?.autoCreateShortageFromPos !== false, recommendedPurchaseLines: recs.filter(x => x.suggestedQuantity > 0).length, criticalPurchaseLines: recs.filter(x => x.priority === 'critical').length, generatedAt: new Date().toISOString() }; }
}
