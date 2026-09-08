export class OwnerCenterActivationAdapter {
    baseUrl;
    productCode;
    constructor(baseUrl, productCode) {
        this.baseUrl = baseUrl;
        this.productCode = productCode;
    }
    async resolve(companyCode) { if (!this.baseUrl)
        return null; const url = new URL('/api/customer/activation', this.baseUrl); url.searchParams.set('companyCode', companyCode); url.searchParams.set('productCode', this.productCode); const response = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(10_000) }); if (response.status === 404)
        return null; if (!response.ok)
        throw new Error(`OWNER_CENTER_${response.status}`); const body = await response.json(); if (!body?.customerCode || !body?.customerName)
        return null; return { customerCode: String(body.customerCode), customerName: String(body.customerName), status: body.status ?? 'trial', plan: String(body.plan ?? 'professional'), ...(body.expiresAt ? { expiresAt: String(body.expiresAt) } : {}), features: Array.isArray(body.features) ? body.features.map(String) : [] }; }
}
