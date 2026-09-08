import type { DbTx } from '../../../core/db/types.js';

export type LoyaltyAccount = Readonly<{
  tenantId: string;
  customerId: string;
  points: number;
  updatedAt: string;
}>;

export type LoyaltyRule = Readonly<{
  tenantId: string;
  enabled: boolean;
  earnPointsPerCurrency: number;
  pointValue: number;
  minRedeemPoints: number;
  maxRedeemPercent: number;
  updatedAt: string;
}>;

export type LoyaltyRedemptionQuote = Readonly<{
  requestedPoints: number;
  approvedPoints: number;
  availablePoints: number;
  maxPointsBySale: number;
  discount: number;
  pointValue: number;
  minRedeemPoints: number;
  maxRedeemPercent: number;
}>;

export type LoyaltyReturnAdjustment = Readonly<{
  restoredRedeemedPoints: number;
  reversedEarnedPoints: number;
}>;

export interface LoyaltyContract {
  get(tenantId: string, customerId: string, tx?: DbTx): Promise<LoyaltyAccount>;
  getRule(tenantId: string, tx?: DbTx): Promise<LoyaltyRule>;
  saveRule(input: {
    tenantId: string;
    enabled: boolean;
    earnPointsPerCurrency: number;
    pointValue: number;
    minRedeemPoints: number;
    maxRedeemPercent: number;
  }): Promise<LoyaltyRule>;
  quoteRedemption(input: {
    tenantId: string;
    customerId: string;
    requestedPoints: number;
    saleAmount: number;
  }, tx?: DbTx): Promise<LoyaltyRedemptionQuote>;
  redeemForSale(input: {
    tenantId: string;
    customerId: string;
    requestedPoints: number;
    saleAmount: number;
    referenceId: string;
  }, tx: DbTx): Promise<LoyaltyRedemptionQuote>;
  earnForAmount(input: {
    tenantId: string;
    customerId: string;
    amount: number;
    referenceId: string;
  }, tx: DbTx): Promise<number>;
  reverseForReturn(input: {
    tenantId: string;
    customerId: string;
    earnedPoints: number;
    redeemedPoints: number;
    proportion: number;
    referenceId: string;
  }, tx: DbTx): Promise<LoyaltyReturnAdjustment>;
  history(tenantId: string, customerId: string, limit?: number): Promise<unknown[]>;
}
