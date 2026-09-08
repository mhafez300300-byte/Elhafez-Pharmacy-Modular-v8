export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_BLOCK_MINUTES = 15;
export const LOGIN_WINDOW_MINUTES = 15;
export function loginIsBlocked(blockedUntil, now = Date.now()) { return !!blockedUntil && new Date(blockedUntil).getTime() > now; }
