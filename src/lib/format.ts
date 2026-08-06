import { localeToBcp47, type AppLocale } from './locale';

function bcp47(locale: AppLocale = 'ko'): string {
  return localeToBcp47(locale);
}

export function formatDateTime(
  value: Date | number,
  options?: Intl.DateTimeFormatOptions,
  locale?: AppLocale
): string {
  const d = typeof value === 'number' ? new Date(value) : value;
  return d.toLocaleString(bcp47(locale), options);
}

export function formatDate(
  value: Date | number,
  options?: Intl.DateTimeFormatOptions,
  locale?: AppLocale
): string {
  const d = typeof value === 'number' ? new Date(value) : value;
  return d.toLocaleDateString(bcp47(locale), options);
}

export function formatTime(
  value: Date | number,
  options?: Intl.DateTimeFormatOptions,
  locale?: AppLocale
): string {
  const d = typeof value === 'number' ? new Date(value) : value;
  return d.toLocaleTimeString(bcp47(locale), options);
}

export function formatNumber(value: number, locale?: AppLocale): string {
  return value.toLocaleString(bcp47(locale));
}

export function formatCurrencyKrw(value: number, locale?: AppLocale): string {
  return new Intl.NumberFormat(bcp47(locale), {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value);
}
