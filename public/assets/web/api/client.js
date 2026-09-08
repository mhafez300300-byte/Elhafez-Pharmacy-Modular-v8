export class ApiError extends Error {
    code;
    status;
    constructor(code, message, status) {
        super(message);
        this.code = code;
        this.status = status;
    }
}
export async function api(path, options = {}) { const response = await fetch(path, { ...options, headers: { 'content-type': 'application/json', ...(options.headers ?? {}) }, credentials: 'same-origin' }); if (response.status === 204)
    return undefined; const body = await response.json().catch(() => ({})); if (!response.ok)
    throw new ApiError(body.error ?? 'REQUEST_FAILED', body.message ?? 'تعذر إتمام العملية', response.status); return body; }
export const post = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body) });
export const put = (path, body) => api(path, { method: 'PUT', body: JSON.stringify(body) });
