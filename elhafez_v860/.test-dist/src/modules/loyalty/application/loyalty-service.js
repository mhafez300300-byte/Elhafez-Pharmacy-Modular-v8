import { AppError } from '../../../core/errors/app-error.js';
import { defaultLoyaltyRule, earnedPointsForAmount, quoteRedemption, validateLoyaltyRule } from '../domain/loyalty-policy.js';
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
export class LoyaltyService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    get(tenantId, customerId, tx) { return this.repo.getAccount(tenantId, customerId, tx); }
    history(tenantId, customerId, limit = 100) { return this.repo.history(tenantId, customerId, limit); }
    async getRule(tenantId, tx) { return await this.repo.getRule(tenantId, tx) ?? defaultLoyaltyRule(tenantId); }
    async saveRule(input) {
        const rule = { ...input };
        validateLoyaltyRule(rule);
        return this.repo.saveRule(rule);
    }
    async quoteRedemption(input, tx) {
        const [rule, account] = await Promise.all([this.getRule(input.tenantId, tx), this.get(input.tenantId, input.customerId, tx)]);
        return quoteRedemption(rule, account.points, input.requestedPoints, input.saleAmount);
    }
    async redeemForSale(input, tx) {
        if (input.requestedPoints <= 0)
            return this.quoteRedemption(input, tx);
        const account = await this.repo.lockAccount(input.tenantId, input.customerId, tx), rule = await this.getRule(input.tenantId, tx), quote = quoteRedemption(rule, account.points, input.requestedPoints, input.saleAmount);
        if (!rule.enabled)
            throw new AppError('LOYALTY_DISABLED', 'برنامج الولاء غير مفعّل', 409);
        if (input.requestedPoints < rule.minRedeemPoints)
            throw new AppError('LOYALTY_MIN_REDEEM', 'عدد النقاط أقل من الحد الأدنى للاستبدال', 422, { minimum: rule.minRedeemPoints });
        if (input.requestedPoints > account.points + 1e-9)
            throw new AppError('LOYALTY_POINTS_INSUFFICIENT', 'نقاط الولاء غير كافية', 409, { available: account.points });
        if (quote.approvedPoints < input.requestedPoints)
            throw new AppError('LOYALTY_REDEMPTION_LIMIT', 'قيمة استبدال النقاط تتجاوز الحد المسموح للفاتورة', 422, { maximumPoints: quote.maxPointsBySale, maxRedeemPercent: rule.maxRedeemPercent });
        await this.repo.addLedger({ tenantId: input.tenantId, customerId: input.customerId, kind: 'redeem', points: -quote.approvedPoints, referenceType: 'sale_redeem', referenceId: input.referenceId }, tx);
        return quote;
    }
    async earnForAmount(input, tx) {
        const rule = await this.getRule(input.tenantId, tx), points = earnedPointsForAmount(rule, input.amount);
        if (points <= 0)
            return 0;
        await this.repo.lockAccount(input.tenantId, input.customerId, tx);
        await this.repo.addLedger({ tenantId: input.tenantId, customerId: input.customerId, kind: 'earn', points, referenceType: 'sale_earn', referenceId: input.referenceId }, tx);
        return points;
    }
    async reverseForReturn(input, tx) {
        const proportion = Math.max(0, Math.min(1, input.proportion));
        const restoredRedeemedPoints = round2(Math.max(0, input.redeemedPoints) * proportion), reversedEarnedPoints = round2(Math.max(0, input.earnedPoints) * proportion);
        await this.repo.lockAccount(input.tenantId, input.customerId, tx);
        if (restoredRedeemedPoints > 0)
            await this.repo.addLedger({ tenantId: input.tenantId, customerId: input.customerId, kind: 'adjust', points: restoredRedeemedPoints, referenceType: 'sale_return_redeem_restore', referenceId: input.referenceId }, tx);
        if (reversedEarnedPoints > 0)
            await this.repo.addLedger({ tenantId: input.tenantId, customerId: input.customerId, kind: 'adjust', points: -reversedEarnedPoints, referenceType: 'sale_return_earn_reverse', referenceId: input.referenceId }, tx);
        return { restoredRedeemedPoints, reversedEarnedPoints };
    }
}
