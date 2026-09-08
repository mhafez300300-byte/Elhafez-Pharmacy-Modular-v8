export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const invariant = (condition: unknown, code: string, message: string, status = 422): asserts condition => {
  if (!condition) throw new AppError(code, message, status);
};
