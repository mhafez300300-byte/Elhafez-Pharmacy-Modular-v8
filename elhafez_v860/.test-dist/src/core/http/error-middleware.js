import { AppError } from '../errors/app-error.js';
export const errorMiddleware = (error, _req, res, _next) => {
    const known = error instanceof AppError;
    const status = known ? error.status : 500;
    const code = known ? error.code : 'INTERNAL_ERROR';
    const message = known ? error.message : 'حدث خطأ غير متوقع';
    if (!known)
        console.error(error);
    res.status(status).json({ error: code, message, ...(known && error.details !== undefined ? { details: error.details } : {}) });
};
