import { AppError } from '../../../core/errors/app-error.js';
export function validateProduct(input) { const name = input.name.trim(); if (name.length < 2)
    throw new AppError('PRODUCT_NAME_REQUIRED', 'اسم الصنف مطلوب', 422); if (input.sellingPrice < 0 || input.costPrice < 0)
    throw new AppError('PRODUCT_PRICE_INVALID', 'السعر والتكلفة لا يمكن أن يكونا سالبين', 422); if ((input.taxRate ?? 0) < 0 || (input.taxRate ?? 0) > 100)
    throw new AppError('PRODUCT_TAX_INVALID', 'نسبة الضريبة غير صحيحة', 422); return { ...input, name, barcode: input.barcode?.trim() || undefined, sku: input.sku?.trim() || undefined, taxRate: input.taxRate ?? 0, reorderLevel: input.reorderLevel ?? 0, requiresPrescription: input.requiresPrescription ?? false, controlledClass: input.controlledClass?.trim() || null, active: input.active ?? true }; }
