export function calculateReorder(input) {
    const current = Math.max(0, Number(input.currentStock) || 0);
    const reorder = Math.max(0, Number(input.reorderLevel) || 0);
    const net7 = Math.max(0, Number(input.net7) || 0);
    const net30 = Math.max(0, Number(input.net30) || 0);
    const targetDays = Math.min(90, Math.max(7, Number(input.targetDays) || 21));
    const avgDaily7 = net7 / 7;
    const avgDaily30 = net30 / 30;
    // Recent demand has more weight, while 30-day demand stabilizes one-off spikes.
    const dailyDemand = avgDaily7 > 0 && avgDaily30 > 0
        ? (avgDaily7 * 0.65) + (avgDaily30 * 0.35)
        : Math.max(avgDaily7, avgDaily30);
    const coverageDays = dailyDemand > 0 ? current / dailyDemand : null;
    const targetStock = Math.ceil((dailyDemand * targetDays) + reorder);
    const suggestedQuantity = Math.max(0, targetStock - current);
    const priority = current <= 0 && dailyDemand > 0
        ? 'critical'
        : (coverageDays !== null && coverageDays <= 7) || current <= reorder
            ? 'high'
            : suggestedQuantity > 0
                ? 'medium'
                : 'none';
    return { avgDaily7, avgDaily30, dailyDemand, coverageDays, targetStock, suggestedQuantity, priority };
}
