import { AppError } from '../errors/app-error.js';
export const requireAuth = (req, _res, next) => {
    if (!req.auth)
        return next(new AppError('AUTH_REQUIRED', 'تسجيل الدخول مطلوب', 401));
    next();
};
