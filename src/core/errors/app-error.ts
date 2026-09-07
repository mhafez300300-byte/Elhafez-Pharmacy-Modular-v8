export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: any;
  constructor(code: string, status = 500, details?: any) {
    super(code); this.name='AppError'; this.code=code; this.status=status; this.details=details;
  }
}
