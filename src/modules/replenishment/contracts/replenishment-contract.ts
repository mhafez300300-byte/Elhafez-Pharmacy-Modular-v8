export type ReplenishmentRecommendation = Readonly<{
  productId: string;
  productName: string;
  barcode: string | null;
  currentStock: number;
  reorderLevel: number;
  sold7: number;
  sold30: number;
  avgDaily7: number;
  avgDaily30: number;
  dailyDemand: number;
  coverageDays: number | null;
  targetStock: number;
  suggestedQuantity: number;
  priority: 'critical' | 'high' | 'medium' | 'none';
}>;
