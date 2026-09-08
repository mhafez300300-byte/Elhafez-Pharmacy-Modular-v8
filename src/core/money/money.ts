import { AppError } from '../errors/app-error.js';

export type Money = Readonly<{ minor: bigint; currency: string }>;

const POW10 = [1n, 10n, 100n, 1000n, 10000n];

export function moneyFromDecimal(value: string | number, currency = 'EGP', scale = 2): Money {
  if (scale < 0 || scale > 4) throw new AppError('MONEY_SCALE_INVALID', 'Unsupported money scale');
  const normalized = typeof value === 'number' ? value.toFixed(scale) : String(value).trim();
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) throw new AppError('MONEY_INVALID', 'Invalid monetary value');
  const negative = normalized.startsWith('-');
  const body = negative ? normalized.slice(1) : normalized;
  const [whole = '0', frac = ''] = body.split('.');
  const factor = POW10[scale] ?? 100n;
  const padded = (frac + '0'.repeat(scale + 1)).slice(0, scale + 1);
  let minor = BigInt(whole) * factor + BigInt(padded.slice(0, scale) || '0');
  const roundDigit = Number(padded[scale] || '0');
  if (roundDigit >= 5) minor += 1n;
  if (negative) minor = -minor;
  return { minor, currency };
}

export function moneyToDecimal(value: Money, scale = 2): string {
  const factor = POW10[scale] ?? 100n;
  const negative = value.minor < 0n;
  const abs = negative ? -value.minor : value.minor;
  const whole = abs / factor;
  const frac = String(abs % factor).padStart(scale, '0');
  return `${negative ? '-' : ''}${whole}${scale ? `.${frac}` : ''}`;
}

export const addMoney = (a: Money, b: Money): Money => {
  if (a.currency !== b.currency) throw new AppError('MONEY_CURRENCY_MISMATCH', 'Currency mismatch');
  return { minor: a.minor + b.minor, currency: a.currency };
};
