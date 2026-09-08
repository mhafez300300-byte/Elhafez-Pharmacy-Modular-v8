export class AppError extends Error {
    code;
    status;
    details;
    constructor(code, message, status = 400, details) {
        super(message);
        this.code = code;
        this.status = status;
        this.details = details;
        this.name = 'AppError';
    }
}
export const invariant = (condition, code, message, status = 422) => {
    if (!condition)
        throw new AppError(code, message, status);
};
