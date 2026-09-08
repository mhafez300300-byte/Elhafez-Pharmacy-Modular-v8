import { AppError } from '../errors/app-error.js';
export function hasPermission(req, permission) {
    const perms = req.auth?.permissions ?? [];
    return !!req.auth && (perms.includes('*') || perms.includes(permission));
}
export const requirePermission = (permission) => (req, _res, next) => {
    if (!req.auth)
        return next(new AppError('AUTH_REQUIRED', 'تسجيل الدخول مطلوب', 401));
    if (hasPermission(req, permission))
        return next();
    return next(new AppError('FORBIDDEN', 'ليس لديك صلاحية لتنفيذ هذه العملية', 403, { permission }));
};
